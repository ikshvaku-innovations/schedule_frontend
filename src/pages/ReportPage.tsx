import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getStoredEvaluation, updateProfessorMarks } from '../lib/vivaEvaluation';
import type { EvaluationResult } from '../lib/vivaEvaluation';
import ThemeToggle from '../components/ThemeToggle';


export default function ReportPage() {
  const { jobId, userId } = useParams<{ jobId: string; userId: string }>();
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [finalMarks, setFinalMarks] = useState<string>('');
  const [aiMarks, setAiMarks] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const analyticsVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!jobId || !userId) return;

    const fetchData = async () => {
      setLoading(true);
      const result = await getStoredEvaluation(jobId, userId);
      if (result) {
        setEvaluation(result.evaluation);
        setAiMarks(result.evaluation.totalMarks);
        if (result.finalMarks !== null) {
          setFinalMarks(String(result.finalMarks));
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [jobId, userId]);

  const handleSaveMarks = async () => {
    if (!jobId || !userId) return;
    setSaving(true);
    const marks = finalMarks.trim() === '' ? null : parseFloat(finalMarks);
    const success = await updateProfessorMarks(jobId, userId, marks);
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="report-page">
        <div className="loading-state" style={{ height: '100vh' }}>
          <div className="spinner large"></div>
          <p>Loading report...</p>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="report-page">
        <div className="empty-state" style={{ height: '100vh' }}>
          <p>No evaluation data found. Please generate the report first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="report-page">
      {/* Header */}
      <header className="report-header">
        <div className="header-left">
          <div className="header-logo">
            <img src="/YudhaLogo.png" alt="Yudha Logo" width="32" height="32" style={{ borderRadius: '8px', objectFit: 'contain' }} />
          </div>
          <h1 className="header-title">Viva Evaluation Report</h1>
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <ThemeToggle />
          <span className="report-position-badge">SSOM CCA4 Viva</span>
        </div>
      </header>

      {/* Top Section */}
      <div className="report-top-section">
        {/* Student Details - Left 2/4 */}
        <div className="report-student-card">
          <div className="student-details-header">
            <div className="student-avatar-large">
              {evaluation.studentName.charAt(0).toUpperCase()}
            </div>
            <div className="student-info-text">
              <h2>{evaluation.studentName}</h2>
              <p>{evaluation.studentEmail}</p>
              <span className="position-tag">SSOM CCA4 Viva</span>
            </div>
          </div>

          <div className="marks-section">
            <div className="marks-card ai-marks-card">
              <div className="marks-card-label">AI Assigned Marks</div>
              <div className="marks-card-value">{aiMarks}<span className="marks-total">/20</span></div>
            </div>
            <div className="marks-card final-marks-card">
              <div className="marks-card-label">Professor Assigned Marks</div>
              <div className="marks-input-group">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={finalMarks}
                  onChange={(e) => setFinalMarks(e.target.value)}
                  placeholder="—"
                  className="marks-input"
                />
                <span className="marks-total-input">/20</span>
              </div>
              <button
                className="btn-save-marks"
                onClick={handleSaveMarks}
                disabled={saving}
              >
                {saving ? (
                  <span className="btn-loading">
                    <span className="spinner"></span>
                    Saving...
                  </span>
                ) : saved ? (
                  '✓ Saved'
                ) : (
                  'Save Marks'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Video Player - Right 1/4 */}
        <div className="report-video-card">
          {evaluation.videoLink ? (
            <>
              <div className="mini-video-wrapper">
                <video
                  ref={videoRef}
                  src={evaluation.videoLink}
                  controls
                  className="mini-video-player"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              <button
                className="btn-analytics"
                onClick={() => setShowAnalytics(true)}
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zm6-4a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zm6-3a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Analytics
              </button>
            </>
          ) : (
            <div className="no-video-placeholder">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" opacity="0.3">
                <rect x="4" y="8" width="40" height="32" rx="4" stroke="hsl(var(--primary))" strokeWidth="2" />
                <path d="M20 18L32 24L20 30V18Z" fill="hsl(var(--primary))" opacity="0.3" />
              </svg>
              <p>Video unavailable</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Summary + Question Analysis */}
      <div className="report-analysis-section">
        {/* Performance Summary Card */}
        {evaluation.summary && (
          <div className="performance-summary-card">
            <div className="performance-summary-header">
              <svg width="24" height="24" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'hsl(var(--primary))' }}>
                <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <h2>Performance Summary</h2>
              <div className="summary-marks-pill">
                {aiMarks}<span>/20</span>
              </div>
            </div>
            <p className="performance-summary-text">{evaluation.summary}</p>
          </div>
        )}

        {/* Question-by-Question Analysis */}
        <h2 className="analysis-title">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'hsl(var(--primary))' }}>
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0114 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          Question-by-Question Analysis
          <span className="question-count">{evaluation.questions.length} Questions</span>
        </h2>

        {evaluation.questions.map((q, i) => (
          <div key={i} className="question-card">
            <div className="question-number">
              <span className="q-num">Q{i + 1}</span>
            </div>
            <div className="question-content">
              <div className="question-text">
                <h4>Question</h4>
                <p>{q.question}</p>
              </div>
              <div className="answer-text">
                <h4>Student's Answer</h4>
                <p>{q.answer}</p>
              </div>
              <div className="evaluation-text">
                <h4>Evaluation</h4>
                <p>{q.evaluation}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Bottom Summary */}
        <div className="report-summary-card">
          <div className="summary-row">
            <span>Total Questions Attempted</span>
            <span className="summary-value">{evaluation.questions.length}</span>
          </div>
          <div className="summary-row highlight">
            <span>AI Assigned Marks</span>
            <span className="summary-value">{aiMarks}/20</span>
          </div>
          {finalMarks && (
            <div className="summary-row highlight final-row">
              <span>Professor Assigned Marks</span>
              <span className="summary-value">{finalMarks}/20</span>
            </div>
          )}
        </div>
      </div>

      {/* Analytics Dialog */}
      {showAnalytics && evaluation.videoLink && (
        <div className="dialog-overlay" onClick={() => setShowAnalytics(false)}>
          <div
            className="dialog-content analytics-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dialog-header">
              <h2>Video Analytics</h2>
              <button className="dialog-close" onClick={() => setShowAnalytics(false)}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                </svg>
              </button>
            </div>
            <div className="dialog-body analytics-body">
              {/* Video - 3/4 */}
              <div className="analytics-video-section">
                <video
                  ref={analyticsVideoRef}
                  src={evaluation.videoLink}
                  controls
                  className="analytics-video-player"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
              {/* Insights - 1/4 */}
              <div className="analytics-violations-section">
                <h3>Insights & Analysis</h3>
                {evaluation.videoInsights && evaluation.videoInsights.overall_summary ? (
                  <div className="insights-container">
                    <div className="insights-summary">
                      <div className="insights-score-badge">
                        Confidence
                        <span>{String(evaluation.videoInsights.confidence_score)}</span>
                      </div>
                      <p>{String(evaluation.videoInsights.overall_summary)}</p>
                    </div>
                    
                    <div className="insights-categories">
                      {Object.entries(evaluation.videoInsights).map(([key, value]) => {
                        // Skip top-level fields
                        if (key === 'overall_summary' || key === 'confidence_score' || !value || typeof value !== 'object') return null;
                        
                        const categoryName = key.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        const categoryData = value as { score: number, observations: string[] };
                        
                        return (
                          <div key={key} className="insight-category-card">
                            <div className="category-header">
                              <h4>{categoryName}</h4>
                              <div className="category-score" style={{ 
                                backgroundColor: categoryData.score >= 80 ? 'hsl(142 70% 45% / 0.1)' : categoryData.score >= 60 ? 'hsl(45 90% 45% / 0.1)' : 'hsl(0 84% 60% / 0.1)',
                                color: categoryData.score >= 80 ? 'hsl(142 70% 45%)' : categoryData.score >= 60 ? 'hsl(45 90% 45%)' : 'hsl(0 84% 60%)'
                              }}>
                                {categoryData.score}
                              </div>
                            </div>
                            <ul className="category-observations">
                              {categoryData.observations?.map((obs, idx) => (
                                <li key={idx}>{obs}</li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="no-violations">
                    <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.3">
                      <path fillRule="evenodd" clipRule="evenodd" d="M20 36C28.8366 36 36 28.8366 36 20C36 11.1634 28.8366 4 20 4C11.1634 4 4 11.1634 4 20C4 28.8366 11.1634 36 20 36ZM20 32C26.6274 32 32 26.6274 32 20C32 13.3726 26.6274 8 20 8C13.3726 8 8 13.3726 8 20C8 26.6274 13.3726 32 20 32Z" fill="hsl(var(--primary))"/>
                      <path d="M20 12V20L25.6569 25.6569" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p>Analysis in progress or unavailable</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
