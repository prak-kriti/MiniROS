import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api';

const authHighlights = [
  'Track live robot telemetry over WebSockets.',
  'Manage registered devices and stored records.',
  'Receive AI-generated runtime and anomaly insights.',
];

export default function LoginPage() {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(form.email, form.password);
      saveAuth(res.access_token, res.user);
      navigate('/devices');
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell auth-layout">
      <section className="auth-card panel">
        <aside className="auth-aside">
          <span className="eyebrow">Operator Access</span>
          <h1 className="auth-title">Sign in to your Mini-ROS control room.</h1>
          <p className="auth-copy">
            Resume live telemetry review, AI monitoring, and command dispatch across your connected robots.
          </p>
          <div className="auth-highlights">
            {authHighlights.map((item) => (
              <div key={item} className="auth-highlight">
                <strong>{item}</strong>
              </div>
            ))}
          </div>
        </aside>

        <div className="auth-body">
          <span className="eyebrow">Welcome Back</span>
          <h2 className="auth-title" style={{ fontSize: '2.2rem' }}>Login</h2>
          <p className="auth-copy">Use your account to reopen the robotics dashboard.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form className="auth-form" onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} required placeholder="Enter your password" />
            </div>
            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="form-footer" style={{ marginTop: '18px' }}>
            Do not have an account? <Link to="/signup">Create one</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
