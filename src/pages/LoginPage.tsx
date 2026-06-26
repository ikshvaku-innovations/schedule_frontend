import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Professor login check
    if (
      email.trim().toLowerCase() === 'madhuri.bhalekar@mitwpu.edu.in' &&
      password === 'madhuri@yudha'
    ) {
      localStorage.setItem('prof_session', JSON.stringify({ email, role: 'professor' }));
      setIsLoading(false);
      navigate('/profdashboard');
      return;
    }

    const normalizedPassword = password.replace(/\s+/g, '');

    if (
      email.trim().toLowerCase() === 'shamla.mantri@mitwpu.edu.in' &&
      (password === 'shamla@yudha' || normalizedPassword === 'shamla@yudha')
    ) {
      localStorage.setItem('prof_session', JSON.stringify({ email, role: 'professor' }));
      setIsLoading(false);
      navigate('/profdashboard');
      return;
    }

    const result = await login(email, password);

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="login-container">
      <div className="login-theme-toggle">
        <ThemeToggle />
      </div>
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <img src="/YudhaLogo.png" alt="Yudha Logo" width="48" height="48" style={{ borderRadius: '12px', objectFit: 'contain' }} />
          </div>
          <h1 className="login-title">Yudha Vivas</h1>
          <p className="login-subtitle">Sign in to manage your sessions</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1a7 7 0 100 14A7 7 0 008 1zm0 10.5a.75.75 0 110-1.5.75.75 0 010 1.5zM8.75 5v3.5a.75.75 0 01-1.5 0V5a.75.75 0 011.5 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
              autoFocus
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-primary login-btn" disabled={isLoading}>
            {isLoading ? (
              <span className="btn-loading">
                <span className="spinner"></span>
                Signing in...
              </span>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
