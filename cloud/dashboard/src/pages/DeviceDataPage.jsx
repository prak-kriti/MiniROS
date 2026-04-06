import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getDeviceData, getDevices } from '../api';
import Navbar from '../components/Navbar';
import DeliveryDashboard from '../components/DeliveryDashboard';

export default function DeviceDataPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('live');

  useEffect(() => {
    const load = async () => {
      try {
        const [data, devices] = await Promise.all([getDeviceData(id, 200), getDevices()]);
        setRows(data);
        setDevice(devices.find((d) => String(d.id) === String(id)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const fmt = (iso) => new Date(iso).toLocaleString();
  const preview = (obj) => Object.entries(obj).slice(0, 4)
    .map(([k, v]) => `${k}: ${typeof v === 'number' && v.toFixed ? v.toFixed(2) : v}`)
    .join(' | ');

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="summary-banner panel">
          <div>
            <span className="eyebrow">Device Workspace</span>
            <h1 className="page-title" style={{ marginTop: '16px' }}>{device ? device.device_name : `Device #${id}`}</h1>
            <p className="page-subtitle" style={{ marginTop: '12px', maxWidth: '56ch' }}>
              Review the live simulation view or inspect stored telemetry records collected for this robot.
            </p>
          </div>
          <div className="button-row">
            <button className="ghost-button" onClick={() => navigate('/devices')}>Back to Devices</button>
          </div>
        </section>

        <div className="tab-row">
          <button className={`tab-button ${tab === 'live' ? 'active' : ''}`} onClick={() => setTab('live')}>Live Simulation</button>
          <button className={`tab-button ${tab === 'records' ? 'active' : ''}`} onClick={() => setTab('records')}>
            Stored Records {rows.length > 0 ? `(${rows.length})` : ''}
          </button>
        </div>

        {tab === 'live' && (
          <section className="tab-panel panel">
            <DeliveryDashboard deviceName={device?.device_name} />
          </section>
        )}

        {tab === 'records' && (
          <section className="tab-panel panel">
            {loading ? (
              <div className="empty-state">
                <h3>Loading device records...</h3>
              </div>
            ) : rows.length === 0 ? (
              <div className="empty-state">
                <span className="eyebrow">No Records Yet</span>
                <h3 style={{ marginTop: '16px' }}>This device has not posted stored telemetry.</h3>
                <p className="page-subtitle" style={{ marginTop: '10px' }}>
                  Have your robot POST data to <code>/devices/{id}/data</code> to populate this table.
                </p>
              </div>
            ) : (
              <>
                <div className="record-stats">
                  <div className="stat-box">
                    <span className="metric-label">Total Records</span>
                    <strong>{rows.length}</strong>
                  </div>
                  <div className="stat-box">
                    <span className="metric-label">Latest Entry</span>
                    <strong>{fmt(rows[0]?.timestamp).split(',')[0]}</strong>
                  </div>
                  <div className="stat-box">
                    <span className="metric-label">Device ID</span>
                    <strong>#{id}</strong>
                  </div>
                </div>
                <div className="surface-table panel" style={{ boxShadow: 'none' }}>
                  <div className="data-table-wrap">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Timestamp</th>
                          <th>Data Preview</th>
                          <th>Keys</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={row.id}>
                            <td>{rows.length - index}</td>
                            <td>{fmt(row.timestamp)}</td>
                            <td><code>{preview(row.data)}</code></td>
                            <td><span className="data-badge">{Object.keys(row.data).length} keys</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
