import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDevices, deleteDevice } from '../api';
import Navbar from '../components/Navbar';

const S = {
  page: { background: '#0f1117', minHeight: '100vh', color: '#eee', fontFamily: 'sans-serif' },
  body: { padding: '32px 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: '700', margin: 0 },
  addBtn: { padding: '10px 22px', borderRadius: '8px', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: '600' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2d3a' },
  td: { padding: '14px 16px', borderBottom: '1px solid #1a1d2a', fontSize: '14px' },
  badge: { display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: '#1a3d2b', color: '#4ade80', fontSize: '12px' },
  actionBtn: (color) => ({ padding: '6px 14px', borderRadius: '6px', border: `1px solid ${color}`, color, background: 'transparent', cursor: 'pointer', fontSize: '13px', marginRight: '8px' }),
  empty: { textAlign: 'center', padding: '60px 20px', color: '#555' },
  emptyIcon: { fontSize: '48px', marginBottom: '12px' },
  card: { background: '#1e2130', borderRadius: '12px', border: '1px solid #2a2d3a', overflow: 'hidden' },
};

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

  useEffect(() => { load(); }, []);

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete device "${name}"? This will also remove all its data.`)) return;
    try {
      await deleteDevice(id);
      setDevices(d => d.filter(x => x.id !== id));
    } catch (e) {
      alert('Failed to delete device');
    }
  };

  const fmt = (iso) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.header}>
          <h2 style={S.title}>My Devices</h2>
          <button style={S.addBtn} onClick={() => navigate('/devices/add')}>+ Add Device</button>
        </div>

        {loading ? (
          <p style={{ color: '#555' }}>Loading…</p>
        ) : devices.length === 0 ? (
          <div style={{ ...S.card, ...S.empty }}>
            <div style={S.emptyIcon}>🤖</div>
            <p>No devices yet. Add your first robot!</p>
            <button style={S.addBtn} onClick={() => navigate('/devices/add')}>Add Device</button>
          </div>
        ) : (
          <div style={S.card}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>ID</th>
                  <th style={S.th}>Device Name</th>
                  <th style={S.th}>Status</th>
                  <th style={S.th}>Added</th>
                  <th style={S.th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(d => (
                  <tr key={d.id}>
                    <td style={{ ...S.td, color: '#555', fontSize: '12px' }}>#{d.id}</td>
                    <td style={{ ...S.td, fontWeight: '600' }}>{d.device_name}</td>
                    <td style={S.td}><span style={S.badge}>Active</span></td>
                    <td style={{ ...S.td, color: '#888' }}>{fmt(d.created_at)}</td>
                    <td style={S.td}>
                      <button style={S.actionBtn('#60a5fa')} onClick={() => navigate(`/devices/${d.id}/data`)}>
                        View Data
                      </button>
                      <button style={S.actionBtn('#f87171')} onClick={() => handleDelete(d.id, d.device_name)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
