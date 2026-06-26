import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { JobWithSchedule } from '../types';
import { generateAndStoreQuestions } from '../lib/questionGeneration';
import GenerationProgressDialog from './GenerationProgressDialog';
import type { Stage } from './GenerationProgressDialog';

interface ScheduleDialogProps {
  job: JobWithSchedule;
  userId: string;
  istNow: Date;
  onClose: () => void;
  onSaved: () => void;
}

interface TimeSlot {
  date: string; // YYYY-MM-DD
  time: string; // HH:mm (24-hour)
  startDatetime: Date;
  endDatetime: Date;
  endTimeString: string;
  remaining: number;
}

// Ensure local date formatting generates 'YYYY-MM-DD' correctly
const formatDate = (d: Date) => {
  // Extracting YYYY-MM-DD in local time
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function ScheduleDialog({ job, userId, istNow, onClose, onSaved }: ScheduleDialogProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStatus, setSavingStatus] = useState('');
  const [error, setError] = useState('');

  // Generation progress states
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [stages, setStages] = useState<Stage[]>([
    {
      id: 0,
      title: 'Setting the foundation',
      subtitle: {
        incomplete: 'Pending',
        in_progress: 'Checking database...',
        completed: 'Completed',
        failed: 'Verification failed',
      },
      status: 'incomplete',
    },
    {
      id: 1,
      title: 'Gathering key inputs',
      subtitle: {
        incomplete: 'Pending',
        in_progress: 'Loading syllabus configuration...',
        completed: 'Completed',
        failed: 'Failed to load configuration',
      },
      status: 'incomplete',
    },
    {
      id: 2,
      title: 'Shaping the narrative',
      subtitle: {
        incomplete: 'Pending',
        in_progress: 'Generating questions using Gemini AI...',
        completed: 'Completed',
        failed: 'AI generation failed',
      },
      status: 'incomplete',
    },
    {
      id: 3,
      title: 'Fine-tuning the focus',
      subtitle: {
        incomplete: 'Pending',
        in_progress: 'Validating response structure...',
        completed: 'Completed',
        failed: 'Validation failed',
      },
      status: 'incomplete',
    },
    {
      id: 4,
      title: 'Adding the finishing touches',
      subtitle: {
        incomplete: 'Pending',
        in_progress: 'Saving questions securely...',
        completed: 'Completed',
        failed: 'Failed to save questions',
      },
      status: 'incomplete',
    },
  ]);

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (!job.viva_id) {
        setLoading(false);
        setError('This session is not linked to a viva event.');
        return;
      }

      // 1. Fetch the specific viva details from the vivas table
      const { data: vivaData, error: vivaErr } = await supabase
        .from('vivas')
        .select('*')
        .eq('id', job.viva_id)
        .single();

      if (vivaErr) throw vivaErr;
      if (!vivaData || !vivaData.start_date_and_time || !vivaData.end_date_and_time) {
        setLoading(false);
        setError('No schedule window configured for this viva event yet.');
        return;
      }

      // 2. Fetch all jobs with this viva_id to find common schedules and calculate capacity
      const { data: relatedJobs, error: jobsErr } = await supabase
        .from('jobs')
        .select('id')
        .eq('viva_id', job.viva_id);
        
      if (jobsErr) throw jobsErr;
      const jobIds = relatedJobs?.map(j => j.id) || [];
      if (job.id && !job.id.startsWith('placeholder_') && !jobIds.includes(job.id)) {
        jobIds.push(job.id);
      }

      // Filter out any placeholder IDs to avoid Postgres type check issues with UUID column
      const validJobIds = jobIds.filter(id => id && !id.startsWith('placeholder_'));

      // 3. Fetch schedules to calculate capacity
      let schedulesData: any[] = [];
      if (validJobIds.length > 0) {
        const { data: scheds, error: schedulesErr } = await supabase
          .from('schedules')
          .select('scheduled_date, scheduled_start_time')
          .in('job_id', validJobIds);

        if (schedulesErr) throw schedulesErr;
        if (scheds) schedulesData = scheds;
      }

      const bookingsCount: Record<string, number> = {};
      schedulesData?.forEach(s => {
        const timePrefix = s.scheduled_start_time.slice(0, 5); 
        const key = `${s.scheduled_date}_${timePrefix}`;
        bookingsCount[key] = (bookingsCount[key] || 0) + 1;
      });

      // 4. Generate Slots from the viva's start and end date/time
      let generatedSlots: TimeSlot[] = [];

      const winStart = new Date(vivaData.start_date_and_time);
      const winEnd = new Date(vivaData.end_date_and_time);

      let currentSlotStart = new Date(winStart);

      while (currentSlotStart < winEnd) {
        const slotEnd = new Date(currentSlotStart.getTime() + job.duration * 60000);
        if (slotEnd > winEnd) break;

        const dateStr = formatDate(currentSlotStart);
        const timeStr = currentSlotStart.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
        const endTimeStr = slotEnd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });

        const key = `${dateStr}_${timeStr}`;
        const booked = bookingsCount[key] || 0;
        
        if (currentSlotStart > istNow) {
          generatedSlots.push({
            date: dateStr,
            time: timeStr,
            startDatetime: new Date(currentSlotStart),
            endDatetime: new Date(slotEnd),
            endTimeString: endTimeStr,
            remaining: Math.max(0, 4 - booked)
          });
        }

        currentSlotStart = new Date(currentSlotStart.getTime() + job.duration * 60000);
      }

      // Sort slots by time
      generatedSlots.sort((a, b) => a.startDatetime.getTime() - b.startDatetime.getTime());
      
      setSlots(generatedSlots);
      
      const uniqueDates = Array.from(new Set(generatedSlots.map(s => s.date)));
      setAvailableDates(uniqueDates);
      
      if (uniqueDates.length > 0) {
        setSelectedDate(uniqueDates[0]);
      }

    } catch (err: any) {
      console.error(err);
      setError('Failed to load slots: ' + (err.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDate || !selectedTime) {
      setError('Please select a valid time slot');
      return;
    }

    const slotObj = slots.find(s => s.date === selectedDate && s.time === selectedTime);
    if (!slotObj) return;

    setSaving(true);
    setSavingStatus('Saving schedule...');
    setError('');

    try {
      const scheduledEndTime = `${slotObj.endTimeString}:00`;
      const scheduledStartTime = `${slotObj.time}:00`;

      let activeJobId = job.id;
      let activeJdSummary = job.jd_summary;
      let activePositionName = job.position_name;
      let activeNoOfQuestions = job.no_of_questions;

      if (job.id.startsWith('placeholder_')) {
        setSavingStatus('Creating job...');
        const { data: newJob, error: jobErr } = await supabase
          .from('jobs')
          .insert({
            user_id: userId,
            position_name: job.position_name,
            duration: job.duration,
            level: job.level || 'Intermediate',
            jd_summary: job.jd_summary || '',
            viva_id: job.viva_id,
            no_of_questions: job.no_of_questions || '10',
          })
          .select()
          .single();

        if (jobErr) throw jobErr;
        if (!newJob) throw new Error('Failed to create job');

        activeJobId = newJob.id;
        activeJdSummary = newJob.jd_summary;
        activePositionName = newJob.position_name;
        activeNoOfQuestions = newJob.no_of_questions;

        setSavingStatus('Creating session...');
        const { error: sessionErr } = await supabase
          .from('sessions')
          .insert({
            job_id: activeJobId,
            user_id: userId,
            has_video_insights: true,
          });

        if (sessionErr) throw sessionErr;
      }

      setSavingStatus('Saving schedule...');
      if (job.id.startsWith('placeholder_')) {
        const { error: insertError } = await supabase
          .from('schedules')
          .insert({
            job_id: activeJobId,
            user_id: userId,
            scheduled_date: selectedDate,
            scheduled_start_time: scheduledStartTime,
            scheduled_end_time: scheduledEndTime,
          });

        if (insertError) throw insertError;
      } else {
        if (job.schedule) {
          const { error: updateError } = await supabase
            .from('schedules')
            .update({
              scheduled_date: selectedDate,
              scheduled_start_time: scheduledStartTime,
              scheduled_end_time: scheduledEndTime,
              updated_at: new Date().toISOString(),
            })
            .eq('id', job.schedule.id);

          if (updateError) throw updateError;
        } else {
          const { error: insertError } = await supabase
            .from('schedules')
            .insert({
              job_id: activeJobId,
              user_id: userId,
              scheduled_date: selectedDate,
              scheduled_start_time: scheduledStartTime,
              scheduled_end_time: scheduledEndTime,
            });

          if (insertError) throw insertError;
        }
      }

      // Open the cool progress dialog for question generation
      setIsProgressOpen(true);
      
      const handleStageChange = (stageId: number, status: 'incomplete' | 'in_progress' | 'completed' | 'failed') => {
        setStages(prev => {
          const next = prev.map(s => s.id === stageId ? { ...s, status } : s);
          // Calculate progress percentage
          const completedCount = next.filter(s => s.status === 'completed').length;
          const inProgressCount = next.filter(s => s.status === 'in_progress').length;
          const percent = Math.min(100, completedCount * 20 + inProgressCount * 10);
          setProgressPercent(percent);
          return next;
        });
      };

      try {
        await generateAndStoreQuestions(
          activeJobId,
          activeJdSummary,
          activeNoOfQuestions,
          activePositionName,
          handleStageChange
        );
      } catch (genErr) {
        console.error('Failed to generate viva questions:', genErr);
      }

      // Wait a moment for the user to enjoy the finished loading state
      await new Promise(resolve => setTimeout(resolve, 800));
      setIsProgressOpen(false);

      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save schedule');
      setSaving(false);
      setSavingStatus('');
    }
  };

  const currentDaySlots = slots.filter(s => s.date === selectedDate);
  const selectedSlotObj = slots.find(s => s.date === selectedDate && s.time === selectedTime);

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content schedule-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>{job.schedule ? 'Reschedule' : 'Schedule'} Session</h2>
          <button className="dialog-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="dialog-body">
          <div className="schedule-job-info">
            <span className="schedule-job-name">{job.position_name}</span>
            <span className="schedule-job-meta">{job.level} • {job.duration} min • Yudha Vivas Platform</span>
          </div>

          {error && (
            <div className="login-error" style={{ marginBottom: '16px' }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 5v3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="loading-state">
              <div className="spinner large"></div>
              <p>Loading available slots from matching windows...</p>
            </div>
          ) : availableDates.length === 0 ? (
            <div className="empty-state">
              <p>No available slots found for this position.</p>
            </div>
          ) : (
            <>
              <div className="schedule-section">
                <h3>Select Date</h3>
                <div className="date-grid">
                  {availableDates.map(date => {
                    const d = new Date(date + 'T00:00:00Z');
                    return (
                      <button
                        key={date}
                        className={`date-pill ${selectedDate === date ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedDate(date);
                          setSelectedTime('');
                        }}
                      >
                        <span className="date-day">{d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}</span>
                        <span className="date-num">{d.getUTCDate()}</span>
                        <span className="date-month">{d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' })}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="schedule-section">
                <h3>Select Time (IST)</h3>
                {currentDaySlots.length === 0 ? (
                  <p className="no-schedule">No slots available on this date.</p>
                ) : (
                  <div className="time-grid">
                    {currentDaySlots.map(slot => {
                      const isFull = slot.remaining === 0;
                      return (
                        <button
                          key={slot.time}
                          className={`time-pill ${selectedTime === slot.time ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                          disabled={isFull}
                          onClick={() => setSelectedTime(slot.time)}
                        >
                          <span className="time-text">{slot.time}</span>
                          <span className="capacity-text">
                            {isFull ? 'Full' : `${slot.remaining}/4 left`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {selectedSlotObj && (
                <div className="schedule-summary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="hsl(var(--primary))">
                    <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 14A6 6 0 118 2a6 6 0 010 12zm1-6.5V4.5a.75.75 0 00-1.5 0V8c0 .2.08.39.22.53l2 2a.75.75 0 001.06-1.06L9 7.94z" />
                  </svg>
                  <span>
                    {new Date(selectedDate + 'T00:00:00Z').toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      timeZone: 'UTC',
                    })} at {selectedTime} IST
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} disabled={saving || !selectedDate || !selectedTime}>
            {saving ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                {savingStatus || 'Saving...'}
              </span>
            ) : (
              job.schedule ? 'Reschedule' : 'Confirm Schedule'
            )}
          </button>
        </div>
      </div>

      {/* Cool Progress Dialog for Gemini Viva Question Generation */}
      <GenerationProgressDialog
        isOpen={isProgressOpen}
        stages={stages}
        progressPercent={progressPercent}
      />
    </div>
  );
}
