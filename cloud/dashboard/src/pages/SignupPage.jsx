import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../api';

const S = {
  page: { background: '#0f1117', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#eee' },
  card: { background: '#1e2130', borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '420px', border: '1px solid #2a2d3a' },
  logo: { textAlign: 'center', color: '#60a5fa', fontSize: '22px', fontWeight: '700', marginBottom: '28px' },
  title: { fontSize: '24px', fontWeight: '700', marginBottom: '6px', textAlign: 'center' },
  sub: { color: '#888', fontSize: '14px', textAlign: 'center', marginBottom: '28px' },
  label: { fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#111827', border: '1px solid #374151', color: '#eee', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  field: { marginBottom: '18px' },
  btn: { width: '100%', padding: '12px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600', marginTop: '4px' },
  error: { background: '#3d1a1a', color: '#f87171', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  footer: { textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#888' },
  link: { color: '#60a5fa', textDecoration: 'none' },
};

export default function SignupPage() {
  const navigate = useNavigate();
  const { saveAuth } = useAuth();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Passwords do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
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
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>Mini ROS</div>
        <h2 style={S.title}>Create account</h2>
        <p style={S.sub}>Start managing your robots</p>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={submit}>
          <div style={S.field}>
            <label style={S.label}>Email</label>
            <input style={S.input} type="email" value={form.email} onChange={set('email')} required placeholder="you@example.com" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Username</label>
            <input style={S.input} type="text" value={form.username} onChange={set('username')} required placeholder="roboteer42" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" value={form.password} onChange={set('password')} required placeholder="Min 6 characters" />
          </div>
          <div style={S.field}>
            <label style={S.label}>Confirm Password</label>
            <input style={S.input} type="password" value={form.confirm} onChange={set('confirm')} required placeholder="••••••••" />
          </div>
          <button style={S.btn} type="submit" disabled={loading}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p style={S.footer}>
          Already have an account?{' '}
          <Link to="/login" style={S.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}
