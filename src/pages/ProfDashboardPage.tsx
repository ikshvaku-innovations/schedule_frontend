import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { evaluateStudent, getStoredEvaluation } from '../lib/vivaEvaluation';

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

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    // 1. Get jobs with position_name = 'SSOM CCA4 Viva'
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, user_id, position_name')
      .eq('position_name', 'SSOM CCA4 Viva');

    if (jobsError || !jobs || jobs.length === 0) {
      console.error('Error fetching jobs:', jobsError);
      setStudents([]);
      setLoading(false);
      return;
    }

    // 2. Get unique user IDs
    const userIds = [...new Set(jobs.map((j: { user_id: string }) => j.user_id))];

    // 3. Fetch user details
    const { data: users } = await supabase
      .from('users')
      .select('id, name, email')
      .in('id', userIds);

    if (!users) {
      setStudents([]);
      setLoading(false);
      return;
    }

    const userMap = new Map(users.map((u: { id: string; name: string; email: string }) => [u.id, u]));

    // 4. Fetch existing evaluations
    const jobIds = jobs.map((j: { id: string }) => j.id);
    const { data: evals } = await supabase
      .from('viva_evaluations')
      .select('job_id, user_id, ai_marks, final_marks')
      .in('job_id', jobIds);

    const evalMap = new Map(
      (evals || []).map((e: { job_id: string; user_id: string; ai_marks: number | null; final_marks: number | null }) =>
        [`${e.job_id}_${e.user_id}`, e]
      )
    );

    // 5. Build student rows
    const rows: StudentRow[] = jobs.map((job: { id: string; user_id: string; position_name: string }) => {
      const user = userMap.get(job.user_id) as { id: string; name: string; email: string } | undefined;
      const evalData = evalMap.get(`${job.id}_${job.user_id}`) as { ai_marks: number | null; final_marks: number | null } | undefined;

      return {
        userId: job.user_id,
        jobId: job.id,
        name: user?.name || 'Unknown',
        email: user?.email || 'N/A',
        positionName: job.position_name,
        aiMarks: evalData?.ai_marks ?? null,
        finalMarks: evalData?.final_marks ?? null,
        hasEvaluation: !!evalData,
      };
    });

    setStudents(rows);
    setLoading(false);
  }, []);

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
    localStorage.removeItem('prof_session');
    navigate('/login');
  };

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
          <h1 className="header-title">Yudha Vivas — Professor Dashboard</h1>
        </div>
        <div className="header-right">
          <div className="user-info">
            <div className="user-avatar">M</div>
            <span className="user-name">Prof. Madhuri Bhalekar</span>
          </div>
          <button className="btn-outline" onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-title-row">
          <h2 className="dashboard-section-title">SSOM CCA4 Viva — Results Report</h2>
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
              <rect x="8" y="12" width="48" height="40" rx="4" stroke="#1a73e8" strokeWidth="2" />
              <line x1="8" y1="24" x2="56" y2="24" stroke="#1a73e8" strokeWidth="2" />
              <circle cx="16" cy="18" r="2" fill="#1a73e8" />
              <circle cx="24" cy="18" r="2" fill="#1a73e8" />
              <circle cx="32" cy="18" r="2" fill="#1a73e8" />
            </svg>
            <p>No students found for SSOM CCA4 Viva</p>
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
