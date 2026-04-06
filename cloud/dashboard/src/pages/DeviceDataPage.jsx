import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeviceData, getDevices } from '../api';
import Navbar from '../components/Navbar';

const S = {
  page: { background: '#0f1117', minHeight: '100vh', color: '#eee', fontFamily: 'sans-serif' },
  body: { padding: '32px 40px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' },
  title: { fontSize: '22px', fontWeight: '700', margin: 0 },
  back: { padding: '8px 18px', borderRadius: '8px', background: 'transparent', color: '#aaa', border: '1px solid #374151', cursor: 'pointer', fontSize: '14px' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: '12px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #2a2d3a' },
  td: { padding: '12px 16px', borderBottom: '1px solid #1a1d2a', fontSize: '13px', fontFamily: 'monospace', wordBreak: 'break-all' },
  card: { background: '#1e2130', borderRadius: '12px', border: '1px solid #2a2d3a', overflow: 'hidden' },
  empty: { textAlign: 'center', padding: '60px 20px', color: '#555' },
  badge: (color) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: '20px', background: color + '22', color, fontSize: '12px', fontFamily: 'sans-serif' }),
  statsRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' },
  stat: { background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' },
  statLabel: { fontSize: '12px', color: '#888', marginBottom: '6px' },
  statVal: { fontSize: '20px', fontWeight: '600' },
};

export default function DeviceDataPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [data, devices] = await Promise.all([getDeviceData(id, 200), getDevices()]);
        setRows(data);
        setDevice(devices.find(d => String(d.id) === String(id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const fmt = (iso) => new Date(iso).toLocaleString();
  const preview = (obj) => {
    const entries = Object.entries(obj).slice(0, 4);
    return entries.map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed ? v.toFixed(2) : v : v}`).join('  |  ');
  };

  return (
    <div style={S.page}>
      <Navbar />
      <div style={S.body}>
        <div style={S.header}>
          <div>
            <h2 style={S.title}>{device ? device.device_name : `Device #${id}`} — Data</h2>
            <p style={{ color: '#888', margin: '4px 0 0', fontSize: '14px' }}>{rows.length} records stored</p>
          </div>
          <button style={S.back} onClick={() => navigate('/devices')}>← Back</button>
        </div>

        {!loading && rows.length > 0 && (
          <div style={S.statsRow}>
            {[
              { label: 'Total Records', val: rows.length, color: '#60a5fa' },
              { label: 'Latest Entry', val: fmt(rows[0]?.timestamp).split(',')[0], color: '#4ade80' },
              { label: 'Device ID', val: `#${id}`, color: '#a78bfa' },
            ].map(s => (
              <div key={s.label} style={S.stat}>
                <div style={S.statLabel}>{s.label}</div>
                <div style={{ ...S.statVal, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ color: '#555' }}>Loading…</p>
        ) : rows.length === 0 ? (
          <div style={{ ...S.card, ...S.empty }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
            <p>No data yet. Have your robot POST to <code>/devices/{id}/data</code></p>
          </div>
        ) : (
          <div style={S.card}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={S.th}>#</th>
                  <th style={S.th}>Timestamp</th>
                  <th style={S.th}>Data Preview</th>
                  <th style={S.th}>Keys</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id}>
                    <td style={{ ...S.td, color: '#555', width: '60px' }}>{rows.length - i}</td>
                    <td style={{ ...S.td, color: '#888', width: '180px', fontFamily: 'sans-serif' }}>{fmt(r.timestamp)}</td>
                    <td style={{ ...S.td, color: '#ccc' }}>{preview(r.data)}</td>
                    <td style={{ ...S.td, width: '80px' }}>
                      <span style={S.badge('#60a5fa')}>{Object.keys(r.data).length} keys</span>
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
