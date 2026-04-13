import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/logo.png';

const ROBOT_TYPES = [
  { icon: '🤖', name: 'LFR', desc: 'Line Following Robot — follows a track using IR sensors and PID control.' },
  { icon: '🚁', name: 'Drone', desc: 'Autonomous aerial vehicle with full telemetry, GPS, and AI flight insights.' },
  { icon: '📡', name: 'Surveillance', desc: 'Patrol robot with motion/human detection, event logs, and zone tracking.' },
  { icon: '📦', name: 'Delivery', desc: 'Ground delivery robot with route planning and payload tracking.' },
];

const STACK = [
  { layer: 'Robot Edge', tech: 'ROS 2 · Python · ESP8266 · Arduino' },
  { layer: 'Backend', tech: 'FastAPI · MongoDB · WebSocket · JWT' },
  { layer: 'Frontend', tech: 'React · Vite · Axios' },
  { layer: 'Infrastructure', tech: 'Docker Compose · Docker Network' },
  { layer: 'AI Engine', tech: 'NumPy · Z-score · Linear Regression' },
];

function AboutModal({ onClose }) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#13151f', border: '1px solid #2a2d3a', borderRadius: '16px', maxWidth: '640px', width: '100%', maxHeight: '85vh', overflowY: 'auto', padding: '32px', fontFamily: 'var(--sans, sans-serif)', color: '#cde0df' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
          <div>
            <div style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>Platform Overview</div>
            <h2 style={{ margin: 0, fontSize: '1.8rem', letterSpacing: '-0.03em', color: '#cde0df' }}>About Mini-ROS</h2>
            <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#7fa1a6', lineHeight: '1.6' }}>
              Cloud-edge robotics platform for real-time telemetry, control, and AI-driven insights.
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', color: '#7fa1a6', fontSize: '18px', cursor: 'pointer', padding: '4px 10px', lineHeight: 1, flexShrink: 0, marginLeft: '16px' }}>✕</button>
        </div>

        {/* What is it */}
        <div style={{ background: '#1e2130', borderRadius: '12px', padding: '18px', border: '1px solid #2a2d3a', marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>What is Mini-ROS?</div>
          <p style={{ margin: 0, fontSize: '13px', color: '#aac', lineHeight: '1.7' }}>
            Mini-ROS is a full-stack cloud-edge robotics platform that connects physical robots to a live web dashboard.
            Robots run ROS 2 nodes at the edge and stream telemetry to a cloud backend over HTTP and WebSocket.
            The dashboard provides real-time monitoring, command dispatch, stored data records, and on-device AI analysis — all in one place.
          </p>
        </div>

        {/* Architecture */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Architecture</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {['Robot Edge', '→', 'Bridge Agent', '→', 'Cloud Backend', '→', 'Dashboard'].map((item, i) => (
              item === '→'
                ? <span key={i} style={{ color: '#2a2d3a', fontSize: '18px' }}>{item}</span>
                : <div key={i} style={{ background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', padding: '8px 14px', fontSize: '12px', fontWeight: '600', color: '#1ed0b5' }}>{item}</div>
            ))}
          </div>
          <p style={{ margin: '12px 0 0', fontSize: '12px', color: '#555', lineHeight: '1.6' }}>
            The robot publishes telemetry to ROS topics → Bridge Agent forwards it to the cloud via HTTP POST → Backend stores it and broadcasts via WebSocket → Dashboard renders it live.
          </p>
        </div>

        {/* Supported Robots */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Supported Robot Types</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
            {ROBOT_TYPES.map(r => (
              <div key={r.name} style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '22px', flexShrink: 0 }}>{r.icon}</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '13px', color: '#cde0df', marginBottom: '4px' }}>{r.name}</div>
                  <div style={{ fontSize: '12px', color: '#666', lineHeight: '1.5' }}>{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Tech Stack</div>
          <div style={{ background: '#1e2130', borderRadius: '10px', border: '1px solid #2a2d3a', overflow: 'hidden' }}>
            {STACK.map((s, i) => (
              <div key={s.layer} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderTop: i > 0 ? '1px solid #2a2d3a' : 'none' }}>
                <span style={{ fontSize: '12px', color: '#7fa1a6', fontWeight: '600', minWidth: '120px' }}>{s.layer}</span>
                <span style={{ fontSize: '12px', color: '#555', fontFamily: 'monospace' }}>{s.tech}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Features */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Key Features</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
            {[
              'Real-time WebSocket telemetry',
              'AI anomaly detection (Z-score)',
              'Per-robot command dispatch',
              'Live IP camera stream',
              'JWT authentication',
              'Stored telemetry records',
              'Multi-robot dashboard',
              'Docker Compose deployment',
            ].map(f => (
              <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#888' }}>
                <span style={{ color: '#1ed0b5', flexShrink: 0 }}>✓</span> {f}
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #2a2d3a', fontSize: '11px', color: '#333', textAlign: 'center' }}>
          Mini-ROS · Cloud Edge Robotics Platform
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [showAbout, setShowAbout] = useState(false);
  const at = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <>
      <header className="topbar">
        <div className="topbar-inner">
          <button
            type="button"
            className="brand-mark"
            onClick={() => navigate('/')}
            style={{ background: 'transparent', border: 0, padding: 0 }}
          >
            <img src={logo} alt="Mini-ROS" style={{ height: '36px' }} />
          </button>

          <nav className="nav-links">
            <button className={`nav-chip ${at('/devices') ? 'active' : ''}`} onClick={() => navigate('/devices')}>Devices</button>
            <button className={`nav-chip ${at('/devices/add') ? 'active' : ''}`} onClick={() => navigate('/devices/add')}>Register Robot</button>
            <button className="nav-chip" onClick={() => setShowAbout(true)}>About Mini-ROS</button>
          </nav>

          <div className="nav-actions" style={{ alignItems: 'center' }}>
            {user && <span className="floating-tag">{user.email}</span>}
            <button className="ghost-button" onClick={handleLogout}>Logout</button>
          </div>
        </div>
      </header>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </>
  );
}
