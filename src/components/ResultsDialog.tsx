import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { JobWithSchedule, Report, EvalCriteria, EvalScore, ExecutiveAnalysis } from '../types';

interface ResultsDialogProps {
  job: JobWithSchedule;
  onClose: () => void;
}

interface ResultsData {
  report: Report | null;
  criteria: (EvalCriteria & { score?: EvalScore })[];
  executive: ExecutiveAnalysis | null;
}

export default function ResultsDialog({ job, onClose }: ResultsDialogProps) {
  const [data, setData] = useState<ResultsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    setLoading(true);

    const { data: reportData } = await supabase
      .from('reports')
      .select('*')
      .eq('job_id', job.id)
      .single();

    const { data: criteriaData } = await supabase
      .from('eval_criteria')
      .select('*')
      .eq('job_id', job.id)
      .order('order_index');

    const { data: scoresData } = await supabase
      .from('eval_scores')
      .select('*')
      .eq('job_id', job.id);

    const { data: execData } = await supabase
      .from('executive_analysis')
      .select('*')
      .eq('job_id', job.id)
      .single();

    const scoreMap = new Map<string, EvalScore>();
    (scoresData || []).forEach((s: EvalScore) => scoreMap.set(s.criterion_id, s));

    const enrichedCriteria = (criteriaData || []).map((c: EvalCriteria) => ({
      ...c,
      score: scoreMap.get(c.id),
    }));

    setData({
      report: reportData || null,
      criteria: enrichedCriteria,
      executive: execData || null,
    });
    setLoading(false);
  };

  const getDecisionStyle = (decision: string) => {
    switch (decision) {
      case 'selected': return 'decision-selected';
      case 'selected_for_next_round': return 'decision-next-round';
      case 'not_selected': return 'decision-not-selected';
      default: return '';
    }
  };

  const getDecisionLabel = (decision: string) => {
    switch (decision) {
      case 'selected': return 'Selected';
      case 'selected_for_next_round': return 'Selected for Next Round';
      case 'not_selected': return 'Not Selected';
      default: return decision;
    }
  };

  return (
    <div className="dialog-overlay" onClick={onClose}>
      <div className="dialog-content results-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h2>Results: {job.position_name}</h2>
          <button className="dialog-close" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
            </svg>
          </button>
        </div>

        <div className="dialog-body">
          {loading ? (
            <div className="loading-state">
              <div className="spinner large"></div>
              <p>Loading results...</p>
            </div>
          ) : !data?.report ? (
            <div className="empty-state">
              <p>No results available yet.</p>
            </div>
          ) : (
            <div className="results-content">
              {/* Overall Score */}
              <div className="results-score-card">
                <div className="score-circle">
                  <svg viewBox="0 0 120 120">
                    <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                    <circle
                      cx="60" cy="60" r="52" fill="none"
                      stroke={data.report.score >= 70 ? 'hsl(var(--success))' : data.report.score >= 40 ? 'hsl(45 90% 48%)' : 'hsl(var(--destructive))'}
                      strokeWidth="8" strokeLinecap="round"
                      strokeDasharray={`${(data.report.score / 100) * 327} 327`}
                      transform="rotate(-90 60 60)"
                    />
                  </svg>
                  <span className="score-value">{data.report.score}</span>
                </div>
                <div className="score-label">Overall Score</div>
                {data.report.overall_score && (
                  <div className="score-sublabel">Detailed: {data.report.overall_score}/100</div>
                )}
              </div>

              {/* Executive Analysis */}
              {data.executive && (
                <div className="results-section">
                  <h3>Executive Analysis</h3>
                  <div className={`decision-badge ${getDecisionStyle(data.executive.hiring_decision)}`}>
                    {getDecisionLabel(data.executive.hiring_decision)}
                  </div>
                  <p className="exec-summary">{data.executive.executive_summary}</p>

                  {data.executive.key_strengths && data.executive.key_strengths.length > 0 && (
                    <div className="exec-list">
                      <h4>Key Strengths</h4>
                      <ul>
                        {data.executive.key_strengths.map((s, i) => (
                          <li key={i} className="strength-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="hsl(var(--success))">
                              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.78 5.28l-4.5 5.5a.75.75 0 01-1.12.02l-2-2a.75.75 0 111.06-1.06l1.42 1.42 3.96-4.84a.75.75 0 011.18.96z" />
                            </svg>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.executive.areas_of_concern && data.executive.areas_of_concern.length > 0 && (
                    <div className="exec-list">
                      <h4>Areas of Concern</h4>
                      <ul>
                        {data.executive.areas_of_concern.map((c, i) => (
                          <li key={i} className="concern-item">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="hsl(var(--destructive))">
                              <path d="M8 0a8 8 0 100 16A8 8 0 008 0zm0 12a.75.75 0 110-1.5.75.75 0 010 1.5zm.75-3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0v3.5z" />
                            </svg>
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {data.executive.recommendation && (
                    <div className="exec-recommendation">
                      <h4>Recommendation</h4>
                      <p>{data.executive.recommendation}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Eval Criteria + Scores */}
              {data.criteria.length > 0 && (
                <div className="results-section">
                  <h3>Evaluation Criteria</h3>
                  <div className="criteria-list">
                    {data.criteria.map((c) => (
                      <div key={c.id} className="criteria-item">
                        <div className="criteria-header">
                          <span className="criteria-text">{c.criterion_text}</span>
                          {c.category && <span className="criteria-category">{c.category}</span>}
                        </div>
                        {c.score && (
                          <div className="criteria-score">
                            <div className="score-bar-bg">
                              <div
                                className="score-bar-fill"
                                style={{
                                  width: `${c.score.score}%`,
                                  backgroundColor: c.score.score >= 70 ? 'hsl(var(--success))' : c.score.score >= 40 ? 'hsl(45 90% 48%)' : 'hsl(var(--destructive))',
                                }}
                              />
                            </div>
                            <span className="score-num">{c.score.score}/100</span>
                          </div>
                        )}
                        {c.score?.justification && (
                          <p className="criteria-justification">{c.score.justification}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="dialog-footer">
          <button className="btn-primary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
