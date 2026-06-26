import React from 'react';

export interface Stage {
  id: number;
  title: string;
  subtitle: {
    incomplete: string;
    in_progress: string;
    completed: string;
    failed: string;
  };
  status: 'incomplete' | 'in_progress' | 'completed' | 'failed';
}

interface GenerationProgressDialogProps {
  isOpen: boolean;
  stages: Stage[];
  progressPercent: number;
}

export default function GenerationProgressDialog({
  isOpen,
  stages,
  progressPercent,
}: GenerationProgressDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="dialog-overlay" style={{ zIndex: 1100 }}>
      <div
        className="dialog-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '800px',
          width: '90%',
          borderRadius: '1.5rem',
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          background: 'hsl(var(--card))',
          color: 'hsl(var(--card-foreground))',
          border: '1px solid hsl(var(--border))',
          overflow: 'hidden',
        }}
      >
        {/* Banner Section */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'hsl(var(--background))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '1.25rem',
            padding: '20px 24px',
            marginBottom: '20px',
            position: 'relative',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Spinning Indicator on Left */}
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '3px solid rgba(59, 130, 246, 0.1)',
                borderTopColor: '#3b82f6',
                animation: 'spin 1s linear infinite',
                flexShrink: 0,
              }}
            />
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: '18px',
                  fontWeight: 600,
                  color: 'hsl(var(--foreground))',
                }}
              >
                Crafting your interview experience
              </h3>
              <p
                style={{
                  margin: '4px 0 0 0',
                  fontSize: '14px',
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                This usually takes less than a minute.
              </p>
            </div>
          </div>

          {/* Trend/Graph Icon on Right */}
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(59, 130, 246, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </div>
        </div>

        {/* Progress Bar Track */}
        <div
          style={{
            height: '6px',
            background: 'hsl(var(--border))',
            borderRadius: '3px',
            marginBottom: '28px',
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              background: '#3b82f6',
              width: `${progressPercent}%`,
              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderRadius: '3px',
            }}
          />
        </div>

        {/* Stages Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px',
            marginBottom: '10px',
          }}
        >
          {stages.map((stage) => {
            let cardBg = '';
            let cardBorder = '';
            let iconBg = '';
            let subTextColor = '';
            let statusText = '';
            let iconElement: React.ReactNode = null;

            if (stage.status === 'completed') {
              cardBg = 'rgba(16, 185, 129, 0.04)';
              cardBorder = '1px solid rgba(16, 185, 129, 0.3)';
              iconBg = 'rgba(16, 185, 129, 0.1)';
              subTextColor = '#059669';
              statusText = stage.subtitle.completed;
              iconElement = (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              );
            } else if (stage.status === 'in_progress') {
              cardBg = 'rgba(59, 130, 246, 0.04)';
              cardBorder = '1px solid rgba(59, 130, 246, 0.3)';
              iconBg = 'rgba(59, 130, 246, 0.1)';
              subTextColor = '#2563eb';
              statusText = stage.subtitle.in_progress;
              iconElement = (
                <div
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: '2px solid rgba(59, 130, 246, 0.2)',
                    borderTopColor: '#3b82f6',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              );
            } else if (stage.status === 'failed') {
              cardBg = 'rgba(239, 68, 68, 0.04)';
              cardBorder = '1px solid rgba(239, 68, 68, 0.3)';
              iconBg = 'rgba(239, 68, 68, 0.1)';
              subTextColor = '#dc2626';
              statusText = stage.subtitle.failed;
              iconElement = (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              );
            } else {
              // incomplete
              cardBg = 'rgba(239, 68, 68, 0.02)';
              cardBorder = '1px solid rgba(239, 68, 68, 0.15)';
              iconBg = 'rgba(239, 68, 68, 0.08)';
              subTextColor = '#ef4444';
              statusText = stage.subtitle.incomplete;
              iconElement = (
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                </svg>
              );
            }

            return (
              <div
                key={stage.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  background: cardBg,
                  border: cardBorder,
                  borderRadius: '1rem',
                  padding: '16px 20px',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow:
                    stage.status === 'in_progress'
                      ? '0 4px 12px rgba(59, 130, 246, 0.08)'
                      : 'none',
                }}
              >
                {/* Icon Circle */}
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: iconBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: subTextColor,
                    flexShrink: 0,
                  }}
                >
                  {iconElement}
                </div>

                {/* Text Content */}
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 600,
                      color: stage.status === 'incomplete' ? 'hsl(var(--foreground) / 0.6)' : 'hsl(var(--foreground))',
                    }}
                  >
                    {stage.title}
                  </h4>
                  <p
                    style={{
                      margin: '2px 0 0 0',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: subTextColor,
                    }}
                  >
                    {statusText}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Global spinner animation styling */}
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
