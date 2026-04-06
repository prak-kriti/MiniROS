import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDevice } from '../api';
import Navbar from '../components/Navbar';

export default function AddDevicePage() {
  const navigate = useNavigate();
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) {
      setError('Device name is required');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addDevice(deviceName.trim());
      navigate('/devices');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add device');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="summary-banner panel">
          <div>
            <span className="eyebrow">Device Registration</span>
            <h1 className="page-title" style={{ marginTop: '16px' }}>Add a robot to the Mini-ROS fleet.</h1>
            <p className="page-subtitle" style={{ marginTop: '12px', maxWidth: '60ch' }}>
              Use a clear device name so telemetry history, dashboard views, and future multi-robot workflows stay organized.
            </p>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <strong>ROS 2</strong>
              <span className="stat-caption">Edge-ready naming</span>
            </div>
          </div>
        </section>

        <section className="panel" style={{ padding: '28px', maxWidth: '720px' }}>
          <span className="eyebrow">New Robot</span>
          <h2 className="section-title" style={{ marginTop: '16px' }}>Register Device</h2>
          <p className="section-copy" style={{ marginTop: '10px' }}>
            This creates a dashboard entry for your robot and prepares it for telemetry storage and live inspection.
          </p>

          {error && <div className="alert alert-error" style={{ marginTop: '18px' }}>{error}</div>}

          <form className="auth-form" onSubmit={submit} style={{ marginTop: '22px' }}>
            <div className="field">
              <label>Device Name</label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="Example: LFR-001 or Rover Alpha"
                required
                autoFocus
              />
            </div>
            <p className="form-note">Choose a human-friendly name that will make sense in telemetry tables and dashboard widgets.</p>
            <div className="button-row">
              <button className="ghost-button" type="button" onClick={() => navigate('/devices')}>Cancel</button>
              <button className="button" type="submit" disabled={loading}>
                {loading ? 'Registering...' : 'Add Device'}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
