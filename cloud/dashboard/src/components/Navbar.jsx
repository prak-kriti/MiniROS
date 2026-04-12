import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

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
    <header className="topbar">
      <div className="topbar-inner">
        <button
          type="button"
          className="brand-mark"
          onClick={() => navigate('/')}
          style={{ background: 'transparent', border: 0, padding: 0 }}
        >
          <span className="brand-glyph">M</span>
          <span className="brand-copy">
            Mini-ROS
            <small>Cloud Edge Robotics</small>
          </span>
        </button>

        <nav className="nav-links">
          <button className={`nav-chip ${at('/devices') ? 'active' : ''}`} onClick={() => navigate('/devices')}>Devices</button>
          <button className={`nav-chip ${at('/devices/add') ? 'active' : ''}`} onClick={() => navigate('/devices/add')}>Register Robot</button>
        </nav>

        <div className="nav-actions" style={{ alignItems: 'center' }}>
          {user && <span className="floating-tag">{user.email}</span>}
          <button className="ghost-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </header>
  );
}
