import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import type { Job, Schedule, Session, JobWithSchedule, JobStatus } from '../types';
import ScheduleDialog from '../components/ScheduleDialog';
import ResultsDialog from '../components/ResultsDialog';

async function getISTNow(): Promise<Date> {
  try {
    const res = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata');
    const data = await res.json();
    return new Date(data.datetime);
  } catch {
    return new Date();
  }
}

function computeStatus(job: Job, schedule: Schedule | null, now: Date): JobStatus {
  if (job.completed) return 'completed';
  if (!schedule) return 'not_scheduled';

  const dateStr = schedule.scheduled_date;
  const startParts = schedule.scheduled_start_time.split(':');
  const endParts = schedule.scheduled_end_time.split(':');

  // In JS, appending +05:30 to ISO string parses it as IST
  const start = new Date(`${dateStr}T${startParts[0]}:${startParts[1]}:00+05:30`);
  const end = new Date(`${dateStr}T${endParts[0]}:${endParts[1]}:00+05:30`);

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

    const { data: jobsData, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (jobsError || !jobsData) {
      console.error('Error fetching jobs:', jobsError);
      setLoading(false);
      return;
    }

    const jobIds = jobsData.map((j: Job) => j.id);

    const { data: schedulesData } = await supabase
      .from('schedules')
      .select('*')
      .eq('user_id', user.id)
      .in('job_id', jobIds.length > 0 ? jobIds : ['none']);

    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*')
      .eq('user_id', user.id)
      .in('job_id', jobIds.length > 0 ? jobIds : ['none']);

    const scheduleMap = new Map<string, Schedule>();
    (schedulesData || []).forEach((s: Schedule) => scheduleMap.set(s.job_id, s));

    const sessionMap = new Map<string, string>();
    (sessionsData || []).forEach((s: Session) => sessionMap.set(s.job_id, s.id));

    const enriched: JobWithSchedule[] = jobsData.map((job: Job) => {
      const schedule = scheduleMap.get(job.id) || null;
      const status = computeStatus(job, schedule, now);
      const session_id = sessionMap.get(job.id) || null;
      return { ...job, schedule, status, session_id };
    });

    setJobs(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleAttend = async (job: JobWithSchedule) => {
    if (!job.schedule) return;

    const now = await getISTNow();
    const status = computeStatus(job, job.schedule, now);

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

    if (status === 'expired') {
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
      return;
    }

    if (job.session_id) {
      window.open(
        `https://victorious-rock-016b1e91e.2.azurestaticapps.net/?session=${job.session_id}`,
        '_blank'
      );
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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
            <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
              <rect width="48" height="48" rx="12" fill="#1a73e8" />
              <path d="M14 24L22 32L34 16" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="header-title">Yudha Vivas</h1>
        </div>
        <div className="header-right">
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
              <rect x="8" y="12" width="48" height="40" rx="4" stroke="#1a73e8" strokeWidth="2" />
              <line x1="8" y1="24" x2="56" y2="24" stroke="#1a73e8" strokeWidth="2" />
              <circle cx="16" cy="18" r="2" fill="#1a73e8" />
              <circle cx="24" cy="18" r="2" fill="#1a73e8" />
              <circle cx="32" cy="18" r="2" fill="#1a73e8" />
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
                          {(job.status === 'scheduled' || job.status === 'expired') && (
                            <button
                              className="btn-action btn-reschedule"
                              onClick={() => setScheduleDialogJob(job)}
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
                              Attend
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
              <p style={{ lineHeight: '1.6', color: '#4b5563', fontSize: '15px' }}>
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
