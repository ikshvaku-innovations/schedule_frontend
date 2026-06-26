import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Job, Schedule, Session, JobWithSchedule, JobStatus } from '../types';
import ScheduleDialog from '../components/ScheduleDialog';
import ResultsDialog from '../components/ResultsDialog';
import ThemeToggle from '../components/ThemeToggle';


async function getISTNow(): Promise<Date> {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
    const data = await res.json();
    return new Date(data.datetime);
  } catch {
    return new Date();
  }
}

function computeStatus(job: Job, schedule: Schedule | null, now: Date, vivaEndDateTimeStr?: string | null): JobStatus {
  if (job.completed) return 'completed';

  // If the overall viva deadline has passed, and job is not completed, then it's expired
  if (vivaEndDateTimeStr) {
    const vivaEnd = new Date(vivaEndDateTimeStr);
    if (now > vivaEnd) {
      return 'expired';
    }
  }

  if (!schedule) return 'not_scheduled';

  const dateStr = schedule.scheduled_date;
  const startParts = schedule.scheduled_start_time.split(':');

  // In JS, appending +05:30 to ISO string parses it as IST
  const start = new Date(`${dateStr}T${startParts[0]}:${startParts[1]}:00+05:30`);
  
  // Calculate end time by adding job.duration minutes to start time
  const end = new Date(start.getTime() + (job.duration * 60 * 1000));

  if (now >= start && now <= end) return 'active';
  if (now > end) return 'expired';
  return 'scheduled';
}

const statusConfig: Record<JobStatus, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'tag-completed' },
  active: { label: 'Active', className: 'tag-active' },
  expired: { label: 'Expired', className: 'tag-expired' },
  scheduled: { label: 'Scheduled', className: 'tag-scheduled' },
  not_scheduled: { label: 'Not Scheduled', className: 'tag-not-scheduled' },
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [scheduleDialogJob, setScheduleDialogJob] = useState<JobWithSchedule | null>(null);
  const [resultsDialogJob, setResultsDialogJob] = useState<JobWithSchedule | null>(null);
  const [infoDialog, setInfoDialog] = useState<{ title: string; message: React.ReactNode } | null>(null);
  const [istNow, setIstNow] = useState<Date>(new Date());

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const now = await getISTNow();
    setIstNow(now);

    // 1. Fetch assigned vivas from vivas table where assigned_student_ids contains user.id
    const { data: vivasData, error: vivasError } = await supabase
      .from('vivas')
      .select('*')
      .contains('assigned_student_ids', [user.id]);

    if (vivasError || !vivasData) {
      console.error('Error fetching vivas:', vivasError);
      setLoading(false);
      return;
    }

    const assignedVivaIds = vivasData.map((v: any) => v.id);

    // 2. Fetch jobs for the user matching these viva IDs
    let existingJobsData: Job[] = [];
    if (assignedVivaIds.length > 0) {
      const { data: fetchedJobs, error: jobsError } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .in('viva_id', assignedVivaIds)
        .eq('is_deleted', false);

      if (jobsError) {
        console.error('Error fetching jobs:', jobsError);
        setLoading(false);
        return;
      }
      if (fetchedJobs) existingJobsData = fetchedJobs;
    }

    const jobsMap = new Map<string, Job>();
    existingJobsData.forEach((j: Job) => {
      if (j.viva_id) {
        jobsMap.set(j.viva_id, j);
      }
    });

    // 3. For any assigned viva that does not have a job record, create a virtual placeholder job object
    const jobsList: Job[] = [];
    for (const viva of vivasData) {
      let job = jobsMap.get(viva.id);
      if (!job) {
        // Use a placeholder job representation
        job = {
          id: `placeholder_${viva.id}`,
          user_id: user.id,
          position_name: viva.name,
          duration: parseInt(viva.duration) || 30,
          level: 'Intermediate',
          created_at: viva.created_at || new Date().toISOString(),
          updated_at: viva.updated_at || new Date().toISOString(),
          is_deleted: false,
          completed: false,
          jd_summary: viva.jd_summary || '',
          is_hr_interview: false,
          has_video_insights: false,
          no_of_questions: '10',
          viva_id: viva.id,
        };
      }
      jobsList.push(job);
    }

    const jobIds = jobsList.map((j: Job) => j.id);
    const validJobIds = jobIds.filter(id => id && !id.startsWith('placeholder_'));

    // 4. Fetch schedules & sessions
    let schedulesData: Schedule[] = [];
    let sessionsData: Session[] = [];

    if (validJobIds.length > 0) {
      const { data: scheds } = await supabase
        .from('schedules')
        .select('*')
        .eq('user_id', user.id)
        .in('job_id', validJobIds);
      if (scheds) schedulesData = scheds;

      const { data: sess } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', user.id)
        .in('job_id', validJobIds);
      if (sess) sessionsData = sess;
    }

    const scheduleMap = new Map<string, Schedule>();
    schedulesData.forEach((s: Schedule) => scheduleMap.set(s.job_id, s));

    const sessionMap = new Map<string, string>();
    sessionsData.forEach((s: Session) => sessionMap.set(s.job_id, s.id));

    const enriched: JobWithSchedule[] = jobsList.map((job: Job) => {
      const isPlaceholder = job.id.startsWith('placeholder_');
      const schedule = isPlaceholder ? null : (scheduleMap.get(job.id) || null);
      const viva = vivasData.find((v: any) => v.id === job.viva_id);
      const status = computeStatus(job, schedule, now, viva?.end_date_and_time);
      const session_id = isPlaceholder ? null : (sessionMap.get(job.id) || null);
      return {
        ...job,
        schedule,
        status,
        session_id,
        viva_end_date_and_time: viva?.end_date_and_time || null
      };
    });

    // Sort by created_at descending
    enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setJobs(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAttend = async (job: JobWithSchedule) => {
    const now = await getISTNow();
    const status = computeStatus(job, job.schedule, now, job.viva_end_date_and_time);

    if (status === 'expired') {
      if (job.schedule) {
        const dateFormated = new Date(job.schedule.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        setInfoDialog({
          title: 'Session Expired',
          message: (
            <>
              The scheduled time for this session (<strong>{dateFormated}</strong> at <strong>{job.schedule.scheduled_start_time.slice(0, 5)}</strong>) has passed.
              <br /><br />
              Please contact your professor.
            </>
          )
        });
      } else {
        setInfoDialog({
          title: 'Session Expired',
          message: (
            <>
              The deadline for this viva event has passed and you did not schedule or attempt it.
              <br /><br />
              Please contact your professor.
            </>
          )
        });
      }
      return;
    }

    if (!job.schedule) return;

    if (status === 'scheduled') {
      const dateFormated = new Date(job.schedule.scheduled_date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      setInfoDialog({
        title: 'Session Not Started',
        message: (
          <>
            Your time slot is <strong>{dateFormated}</strong> from <strong>{job.schedule.scheduled_start_time.slice(0, 5)}</strong> to <strong>{job.schedule.scheduled_end_time.slice(0, 5)}</strong>.
            <br /><br />
            You cannot attempt it now.
          </>
        )
      });
      return;
    }

    if (job.session_id) {
      window.open(
        `https://interview.shauryalabs.in/?session=${job.session_id}`,
        '_blank'
      );
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (confirmLogout) {
      logout();
      navigate('/login');
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <img src="/YudhaLogo.png" alt="Yudha Logo" width="32" height="32" style={{ borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h1 className="header-title">Yudha Vivas</h1>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <div className="user-info">
            <div className="user-avatar">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <span className="user-name">{user.name}</span>
          </div>
          <button className="btn-outline" onClick={handleLogout}>
             Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2 className="dashboard-section-title">Your Sessions</h2>
          <button className="btn-icon" onClick={fetchJobs} title="Refresh">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner large"></div>
            <p>Loading your sessions...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.4">
              <rect x="8" y="12" width="48" height="40" rx="6" stroke="hsl(var(--primary))" strokeWidth="2" />
              <line x1="8" y1="24" x2="56" y2="24" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="16" cy="18" r="2" fill="hsl(var(--primary))" />
              <circle cx="24" cy="18" r="2" fill="hsl(var(--primary))" />
              <circle cx="32" cy="18" r="2" fill="hsl(var(--primary))" />
            </svg>
            <p>No sessions found</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="jobs-table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Level</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Scheduled For</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => {
                  const sc = statusConfig[job.status];
                  return (
                    <tr key={job.id}>
                      <td className="job-title-cell">
                        <span className="job-title">{job.position_name}</span>
                      </td>
                      <td>
                        <span className="level-badge">{job.level}</span>
                      </td>
                      <td>{job.duration} min</td>
                      <td>
                        <span className={`status-tag ${sc.className}`}>{sc.label}</span>
                      </td>
                      <td>
                        {job.schedule ? (
                          <span className="schedule-info">
                            {new Date(job.schedule.scheduled_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}{' '}
                            at {job.schedule.scheduled_start_time.slice(0, 5)} IST
                          </span>
                        ) : (
                          <span className="no-schedule">—</span>
                        )}
                      </td>
                      <td>
                        <div className="action-buttons">
                          {job.status === 'not_scheduled' && (
                            <button
                              className="btn-action btn-schedule"
                              onClick={() => setScheduleDialogJob(job)}
                            >
                              Schedule
                            </button>
                          )}
                          {(job.status === 'scheduled' || (job.status === 'expired' && job.schedule)) && (
                            <button
                              className="btn-action btn-reschedule"
                              onClick={() => setScheduleDialogJob(job)}
                              disabled={job.viva_end_date_and_time ? new Date(istNow) > new Date(job.viva_end_date_and_time) : false}
                            >
                              Reschedule
                            </button>
                          )}
                          {(job.status === 'active' || job.status === 'scheduled' || job.status === 'expired') && (
                            <button
                              className="btn-action btn-attend"
                              onClick={() => handleAttend(job)}
                              disabled={job.status === 'active' && !job.session_id}
                            >
                              Attempt
                            </button>
                          )}
                          <button
                            className="btn-action btn-results"
                            disabled={!job.completed}
                            onClick={() => job.completed && setResultsDialogJob(job)}
                          >
                            Results
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {scheduleDialogJob && (
        <ScheduleDialog
          job={scheduleDialogJob}
          userId={user.id}
          istNow={istNow}
          onClose={() => setScheduleDialogJob(null)}
          onSaved={() => {
            setScheduleDialogJob(null);
            fetchJobs();
          }}
        />
      )}

      {resultsDialogJob && (
        <ResultsDialog
          job={resultsDialogJob}
          onClose={() => setResultsDialogJob(null)}
        />
      )}

      {infoDialog && (
        <div className="dialog-overlay" onClick={() => setInfoDialog(null)}>
          <div className="dialog-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="dialog-header">
              <h2>{infoDialog.title}</h2>
              <button className="dialog-close" onClick={() => setInfoDialog(null)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </div>
            <div className="dialog-body">
              <p style={{ lineHeight: '1.6', color: 'hsl(var(--foreground) / 0.85)', fontSize: '15px' }}>
                {infoDialog.message}
              </p>
            </div>
            <div className="dialog-footer" style={{ justifyContent: 'flex-end', display: 'flex' }}>
              <button className="btn-primary" onClick={() => setInfoDialog(null)}>Got it</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
