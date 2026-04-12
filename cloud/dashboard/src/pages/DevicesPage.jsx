import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDevices, deleteDevice } from '../api';
import Navbar from '../components/Navbar';

export default function DevicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getDevices();
      setDevices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete device "${name}"? This will also remove all its data.`)) return;
    try {
      await deleteDevice(id);
      setDevices((current) => current.filter((device) => device.id !== id));
    } catch (e) {
      alert('Failed to delete device');
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="summary-banner panel">
          <div>
            <span className="eyebrow">Fleet Workspace</span>
            <h1 className="page-title" style={{ marginTop: '16px' }}>Connected robots, one operator view.</h1>
            <p className="page-subtitle" style={{ marginTop: '12px', maxWidth: '58ch' }}>
              Register robots, inspect stored telemetry, and move into live monitoring from a unified Mini-ROS console.
            </p>
          </div>
          <div className="hero-metrics">
            <div className="hero-metric">
              <strong>{devices.length}</strong>
              <span className="stat-caption">Registered devices</span>
            </div>
            <div className="hero-metric">
              <strong>{user?.username || 'Operator'}</strong>
              <span className="stat-caption">Active account</span>
            </div>
          </div>
        </section>

        <div className="page-header" style={{ marginBottom: '18px' }}>
          <div>
            <h2 className="page-title" style={{ fontSize: '2rem' }}>My Devices</h2>
            <p className="page-subtitle">Each robot can be tracked through stored records and live dashboard telemetry.</p>
          </div>
          <button className="button" onClick={() => navigate('/devices/add')}>Register New Robot</button>
        </div>

        {loading ? (
          <section className="empty-state panel">
            <h3>Loading device registry...</h3>
          </section>
        ) : devices.length === 0 ? (
          <section className="empty-state panel">
            <span className="eyebrow">No Devices Yet</span>
            <h3 style={{ marginTop: '16px' }}>Start with your first Mini-ROS robot.</h3>
            <p className="page-subtitle" style={{ marginTop: '10px', marginBottom: '18px' }}>
              Add a robot to begin storing telemetry and opening the live dashboard.
            </p>
            <button className="button" onClick={() => navigate('/devices/add')}>Add Device</button>
          </section>
        ) : (
          <section className="surface-table panel">
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Device</th>
                    <th>Status</th>
                    <th>Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((device) => (
                    <tr key={device.id}>
                      <td>#{device.id}</td>
                      <td>
                        <strong>{device.device_name}</strong>
                      </td>
                      <td><span className="status-pill">Ready</span></td>
                      <td>{fmt(device.created_at)}</td>
                      <td>
                        <div className="button-row">
                          <button className="ghost-button" onClick={() => navigate(`/devices/${device.id}/data`)}>Live Dashboard</button>
                          <button className="danger-button" onClick={() => handleDelete(device.id, device.device_name)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
