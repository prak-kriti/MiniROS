import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../api';

const authHighlights = [
  'Create a secure workspace for robot telemetry and commands.',
  'Register multiple robots under one dashboard.',
  'Start monitoring cloud-edge runtime behavior immediately.',
];

export default function SignupPage() {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      const res = await signup(form.email, form.username, form.password);
      saveAuth(res.access_token, res.user);
      navigate('/devices');
    } catch (err) {
      setError(err.response?.data?.detail || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell auth-layout">
      <section className="auth-card panel">
        <aside className="auth-aside">
          <span className="eyebrow">Create Workspace</span>
          <h1 className="auth-title">Start building with Mini-ROS.</h1>
          <p className="auth-copy">
            Create an account to manage devices, review telemetry history, and work with the live cloud-edge dashboard.
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
          <span className="eyebrow">New Operator</span>
          <h2 className="auth-title" style={{ fontSize: '2.2rem' }}>Sign Up</h2>
          <p className="auth-copy">Provision an operator account for your robotics project.</p>

          {error && <div className="alert alert-error">{error}</div>}

          <form className="auth-form" onSubmit={submit}>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
            </div>
            <div className="field">
              <label>Username</label>
              <input type="text" value={form.username} onChange={set('username')} required placeholder="robotics-operator" />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={form.password} onChange={set('password')} required placeholder="Minimum 6 characters" />
            </div>
            <div className="field">
              <label>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} required placeholder="Repeat your password" />
            </div>
            <button className="button" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="form-footer" style={{ marginTop: '18px' }}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </section>
    </div>
  );
}
