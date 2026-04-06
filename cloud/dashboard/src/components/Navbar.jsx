import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const S = {
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 40px', borderBottom: '1px solid #2a2d3a', background: '#0f1117', position: 'sticky', top: 0, zIndex: 100 },
  logo: { color: '#60a5fa', fontWeight: '700', fontSize: '18px', cursor: 'pointer' },
  links: { display: 'flex', gap: '4px' },
  link: (active) => ({ padding: '7px 14px', borderRadius: '7px', fontSize: '14px', color: active ? '#eee' : '#888', background: active ? '#1e2130' : 'transparent', cursor: 'pointer', border: 'none', fontFamily: 'sans-serif' }),
  right: { display: 'flex', alignItems: 'center', gap: '16px' },
  user: { fontSize: '13px', color: '#888' },
  logout: { padding: '7px 16px', borderRadius: '7px', background: 'transparent', border: '1px solid #374151', color: '#aaa', cursor: 'pointer', fontSize: '13px', fontFamily: 'sans-serif' },
};

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const at = (path) => location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav style={S.nav}>
      <span style={S.logo} onClick={() => navigate('/')}>Mini ROS</span>

      <div style={S.links}>
        <button style={S.link(at('/devices'))} onClick={() => navigate('/devices')}>Devices</button>
        <button style={S.link(at('/dashboard'))} onClick={() => navigate('/dashboard')}>Live Dashboard</button>
      </div>

      <div style={S.right}>
        {user && <span style={S.user}>{user.email}</span>}
        <button style={S.logout} onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
