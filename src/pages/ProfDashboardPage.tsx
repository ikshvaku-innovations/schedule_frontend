import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { evaluateStudent, getStoredEvaluation } from '../lib/vivaEvaluation';
import ThemeToggle from '../components/ThemeToggle';
import type { Job } from '../types';


interface StudentRow {
  userId: string;
  jobId: string;
  name: string;
  email: string;
  positionName: string;
  aiMarks: number | null;
  finalMarks: number | null;
  hasEvaluation: boolean;
}

export default function ProfDashboardPage() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [evaluatingIds, setEvaluatingIds] = useState<Set<string>>(new Set());

  const profInfo = useMemo(() => {
    const sessionStr = localStorage.getItem('prof_session');
    if (sessionStr) {
      try {
        const session = JSON.parse(sessionStr);
        if (session.email.toLowerCase() === 'shamla.mantri@mitwpu.edu.in') {
          return { name: 'Prof. Shamla Mantri', title: 'ITW LCA2 Viva', initial: 'S' };
        }
      } catch (e) {}
    }
    return { name: 'Prof. Madhuri Bhalekar', title: 'SSOM CCA4 Viva', initial: 'M' };
  }, []);

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    // 1. Get the viva matching the name
    const { data: vivas, error: vivasError } = await supabase
      .from('vivas')
      .select('*')
      .eq('name', profInfo.title);

    if (vivasError || !vivas || vivas.length === 0) {
      console.error('Error fetching vivas:', vivasError);
      setStudents([]);
      setLoading(false);
      return;
    }

    // 2. Get unique user IDs and viva IDs
    const studentIds = [...new Set(vivas.flatMap(v => v.assigned_student_ids || []))];
    const vivaIds = vivas.map(v => v.id);

    // 3. Fetch user details from users_login
    const { data: users, error: usersError } = await supabase
      .from('users_login')
      .select('id, name, email_id')
      .in('id', studentIds.length > 0 ? studentIds : ['none']);

    if (usersError || !users) {
      console.error('Error fetching users:', usersError);
      setStudents([]);
      setLoading(false);
      return;
    }

    const userMap = new Map(users.map((u: { id: string; name: string; email_id: string }) => [u.id, u]));

    // 4. Fetch existing job records for these vivas and students
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .in('viva_id', vivaIds.length > 0 ? vivaIds : ['none'])
      .in('user_id', studentIds.length > 0 ? studentIds : ['none'])
      .eq('is_deleted', false);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      setStudents([]);
      setLoading(false);
      return;
    }

    const jobsMap = new Map<string, Job>();
    jobs?.forEach((j: Job) => {
      if (j.viva_id) {
        jobsMap.set(`${j.viva_id}_${j.user_id}`, j);
      }
    });

    // 5. Ensure every assigned student has a job record (auto-create if missing)
    const finalJobsList: Job[] = [];
    for (const viva of vivas) {
      for (const studentId of viva.assigned_student_ids || []) {
        let job = jobsMap.get(`${viva.id}_${studentId}`);
        if (!job) {
          // Auto-create missing job
          const { data: newJob, error: insertError } = await supabase
            .from('jobs')
            .insert({
              user_id: studentId,
              position_name: viva.name,
              duration: parseInt(viva.duration) || 30,
              level: 'Intermediate',
              jd_summary: viva.jd_summary || '',
              viva_id: viva.id,
            })
            .select()
            .single();

          if (insertError) {
            console.error(`Error auto-creating job for viva ${viva.id} and user ${studentId}:`, insertError);
            continue;
          }
          job = newJob as Job;
        }
        finalJobsList.push(job);
      }
    }

    // 6. Fetch existing evaluations for the job IDs
    const jobIds = finalJobsList.map(j => j.id);
    const { data: evals } = await supabase
      .from('viva_evaluations')
      .select('job_id, user_id, ai_marks, final_marks')
      .in('job_id', jobIds.length > 0 ? jobIds : ['none']);

    const evalMap = new Map(
      (evals || []).map((e: { job_id: string; user_id: string; ai_marks: number | null; final_marks: number | null }) =>
        [`${e.job_id}_${e.user_id}`, e]
      )
    );

    // 7. Build student rows
    const rows: StudentRow[] = finalJobsList.map((job: Job) => {
      const user = userMap.get(job.user_id);
      const evalData = evalMap.get(`${job.id}_${job.user_id}`);

      return {
        userId: job.user_id,
        jobId: job.id,
        name: user?.name || 'Unknown',
        email: user?.email_id || 'N/A',
        positionName: job.position_name,
        aiMarks: evalData?.ai_marks ?? null,
        finalMarks: evalData?.final_marks ?? null,
        hasEvaluation: !!evalData,
      };
    });

    setStudents(rows);
    setLoading(false);
  }, [profInfo.title]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleViewReport = async (student: StudentRow) => {
    const key = `${student.jobId}_${student.userId}`;

    // Check if evaluation exists
    if (student.hasEvaluation) {
      // Open report directly in new tab
      window.open(`/report/${student.jobId}/${student.userId}`, '_blank');
      return;
    }

    // No evaluation — run Gemini evaluation
    setEvaluatingIds(prev => new Set(prev).add(key));

    try {
      const stored = await getStoredEvaluation(student.jobId, student.userId);
      if (stored) {
        // Data was already there, refresh the list
        await fetchStudents();
        window.open(`/report/${student.jobId}/${student.userId}`, '_blank');
        return;
      }

      // Run the evaluation
      const result = await evaluateStudent(student.jobId, student.userId);
      if (result) {
        await fetchStudents();
        window.open(`/report/${student.jobId}/${student.userId}`, '_blank');
      } else {
        alert('Evaluation failed. The transcript might be unavailable for this student.');
      }
    } catch (err) {
      console.error('Evaluation error:', err);
      alert('An error occurred during evaluation. Please try again.');
    } finally {
      setEvaluatingIds(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to sign out?");
    if (confirmLogout) {
      localStorage.removeItem('prof_session');
      navigate('/login');
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="header-left">
          <div className="header-logo">
            <img src="/YudhaLogo.png" alt="Yudha Logo" width="32" height="32" style={{ borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h1 className="header-title">Yudha Vivas — Professor Dashboard</h1>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <div className="user-info">
            <div className="user-avatar">{profInfo.initial}</div>
            <span className="user-name">{profInfo.name}</span>
          </div>
          <button className="btn-outline" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2 className="dashboard-section-title">{profInfo.title} — Results Report</h2>
          <button className="btn-icon" onClick={fetchStudents} title="Refresh">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner large"></div>
            <p>Loading student data...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="empty-state">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" opacity="0.4">
              <rect x="8" y="12" width="48" height="40" rx="6" stroke="hsl(var(--primary))" strokeWidth="2" />
              <line x1="8" y1="24" x2="56" y2="24" stroke="hsl(var(--primary))" strokeWidth="2" />
              <circle cx="16" cy="18" r="2" fill="hsl(var(--primary))" />
              <circle cx="24" cy="18" r="2" fill="hsl(var(--primary))" />
              <circle cx="32" cy="18" r="2" fill="hsl(var(--primary))" />
            </svg>
            <p>No students found for {profInfo.title}</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="jobs-table prof-table">
              <thead>
                <tr>
                  <th>Sr. No.</th>
                  <th>Name</th>
                  <th>Email ID</th>
                  <th>Position Name</th>
                  <th>Marks Earned</th>
                  <th>Final Marks</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const isEvaluating = evaluatingIds.has(`${student.jobId}_${student.userId}`);
                  return (
                    <tr key={`${student.jobId}_${student.userId}`}>
                      <td>{index + 1}</td>
                      <td className="job-title-cell">
                        <span className="job-title">{student.name}</span>
                      </td>
                      <td>
                        <span className="student-email">{student.email}</span>
                      </td>
                      <td>
                        <span className="level-badge">{student.positionName}</span>
                      </td>
                      <td>
                        {student.aiMarks !== null ? (
                          <span className="marks-display">{student.aiMarks}/20</span>
                        ) : (
                          <span className="no-schedule">—</span>
                        )}
                      </td>
                      <td>
                        {student.finalMarks !== null ? (
                          <span className="marks-display final">{student.finalMarks}/20</span>
                        ) : (
                          <span className="no-schedule">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          className={`btn-action ${student.hasEvaluation ? 'btn-results' : 'btn-schedule'}`}
                          onClick={() => handleViewReport(student)}
                          disabled={isEvaluating}
                        >
                          {isEvaluating ? (
                            <span className="btn-loading">
                              <span className="spinner"></span>
                              Evaluating...
                            </span>
                          ) : student.hasEvaluation ? (
                            'View Report'
                          ) : (
                            'Generate Report'
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
