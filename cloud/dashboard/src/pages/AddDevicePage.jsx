import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDevice } from '../api';
import Navbar from '../components/Navbar';

const S = {
  page: { background: '#0f1117', minHeight: '100vh', color: '#eee', fontFamily: 'sans-serif' },
  body: { padding: '40px', display: 'flex', justifyContent: 'center' },
  card: { background: '#1e2130', borderRadius: '14px', padding: '40px', width: '100%', maxWidth: '480px', border: '1px solid #2a2d3a' },
  title: { fontSize: '22px', fontWeight: '700', marginBottom: '6px' },
  sub: { color: '#888', fontSize: '14px', marginBottom: '32px' },
  label: { fontSize: '13px', color: '#aaa', marginBottom: '6px', display: 'block' },
  input: { width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#111827', border: '1px solid #374151', color: '#eee', fontSize: '14px', boxSizing: 'border-box', outline: 'none' },
  hint: { fontSize: '12px', color: '#555', marginTop: '6px' },
  field: { marginBottom: '24px' },
  actions: { display: 'flex', gap: '12px', marginTop: '8px' },
  saveBtn: { flex: 1, padding: '12px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '15px', fontWeight: '600' },
  cancelBtn: { flex: 1, padding: '12px', borderRadius: '8px', background: 'transparent', color: '#888', border: '1px solid #374151', cursor: 'pointer', fontSize: '15px' },
  error: { background: '#3d1a1a', color: '#f87171', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
  success: { background: '#1a3d2b', color: '#4ade80', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px' },
};

export default function AddDevicePage() {
  const navigate = useNavigate();
  const [deviceName, setDeviceName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!deviceName.trim()) { setError('Device name is required'); return; }
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
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.card}>
          <h2 style={S.title}>Add New Device</h2>
          <p style={S.sub}>Register a ROS robot to start collecting its telemetry data.</p>

          {error && <div style={S.error}>{error}</div>}

          <form onSubmit={submit}>
            <div style={S.field}>
              <label style={S.label}>Device Name</label>
              <input
                style={S.input}
                type="text"
                value={deviceName}
                onChange={e => setDeviceName(e.target.value)}
                placeholder="e.g. LFR-001, Rover Alpha"
                required
                autoFocus
              />
              <p style={S.hint}>A friendly name to identify this robot in your dashboard.</p>
            </div>

            <div style={S.actions}>
              <button style={S.cancelBtn} type="button" onClick={() => navigate('/devices')}>Cancel</button>
              <button style={S.saveBtn} type="submit" disabled={loading}>
                {loading ? 'Adding…' : 'Add Device'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
