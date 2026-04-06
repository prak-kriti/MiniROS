import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const S = {
  page: { background: '#0f1117', minHeight: '100vh', color: '#eee', fontFamily: 'sans-serif' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 40px', borderBottom: '1px solid #2a2d3a' },
  logo: { fontSize: '20px', fontWeight: '700', color: '#60a5fa', margin: 0 },
  navBtns: { display: 'flex', gap: '12px' },
  btn: (primary) => ({
    padding: '8px 20px', borderRadius: '8px', border: primary ? 'none' : '1px solid #444',
    background: primary ? '#2563eb' : 'transparent', color: '#eee', cursor: 'pointer', fontSize: '14px',
  }),
  hero: { textAlign: 'center', padding: '90px 20px 60px' },
  heroTitle: { fontSize: '52px', fontWeight: '800', margin: '0 0 16px', lineHeight: 1.1 },
  accent: { color: '#60a5fa' },
  heroSub: { fontSize: '18px', color: '#aaa', maxWidth: '520px', margin: '0 auto 40px' },
  heroBtns: { display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' },
  primaryBtn: { padding: '14px 36px', borderRadius: '10px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '16px', fontWeight: '600' },
  secondaryBtn: { padding: '14px 36px', borderRadius: '10px', background: 'transparent', color: '#eee', border: '1px solid #444', cursor: 'pointer', fontSize: '16px' },
  features: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', maxWidth: '900px', margin: '0 auto', padding: '0 20px 80px' },
  card: { background: '#1e2130', borderRadius: '12px', padding: '28px', border: '1px solid #2a2d3a' },
  cardIcon: { fontSize: '32px', marginBottom: '12px' },
  cardTitle: { fontSize: '17px', fontWeight: '600', marginBottom: '8px' },
  cardDesc: { fontSize: '14px', color: '#888', lineHeight: 1.6 },
};

const features = [
  { icon: '🤖', title: 'Multi-Device Support', desc: 'Register and manage multiple ROS-enabled robots from one place.' },
  { icon: '📡', title: 'Real-Time Telemetry', desc: 'Stream live sensor data from your robots via WebSocket.' },
  { icon: '🧠', title: 'AI Analysis', desc: 'Automatic anomaly detection and trend insights on every data point.' },
  { icon: '🔒', title: 'Secure Access', desc: 'JWT-based authentication keeps your robot data private.' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <h1 style={S.logo}>Mini ROS</h1>
        <div style={S.navBtns}>
          {isLoggedIn ? (
            <button style={S.btn(true)} onClick={() => navigate('/devices')}>My Devices</button>
          ) : (
            <>
              <button style={S.btn(false)} onClick={() => navigate('/login')}>Login</button>
              <button style={S.btn(true)} onClick={() => navigate('/signup')}>Sign Up</button>
            </>
          )}
        </div>
      </nav>

      <div style={S.hero}>
        <h2 style={S.heroTitle}>
          Cloud Dashboard for<br /><span style={S.accent}>ROS Robots</span>
        </h2>
        <p style={S.heroSub}>
          Monitor telemetry, send commands, and get AI-powered insights for your line-following robots — from anywhere.
        </p>
        <div style={S.heroBtns}>
          <button style={S.primaryBtn} onClick={() => navigate(isLoggedIn ? '/devices' : '/signup')}>
            {isLoggedIn ? 'Go to Devices' : 'Get Started Free'}
          </button>
          <button style={S.secondaryBtn} onClick={() => navigate('/dashboard')}>
            View Live Dashboard
          </button>
        </div>
      </div>

      <div style={S.features}>
        {features.map(f => (
          <div key={f.title} style={S.card}>
            <div style={S.cardIcon}>{f.icon}</div>
            <div style={S.cardTitle}>{f.title}</div>
            <p style={S.cardDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
