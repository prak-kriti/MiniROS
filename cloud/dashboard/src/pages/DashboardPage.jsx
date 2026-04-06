import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import TelemetryChart from '../components/TelemetryChart';
import ControlPanel from '../components/ControlPanel';
import AIInsights from '../components/AIInsights';
import IRSensors from '../components/IRSensors';
import Navbar from '../components/Navbar';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState([]);
  const [latest, setLatest] = useState(null);
  const { lastMessage, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    axios.get(`${API_URL}/telemetry/history?limit=60`)
      .then((res) => setTelemetry(res.data.data))
      .catch((err) => console.error('History load failed:', err));
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'telemetry') {
      const record = lastMessage.data;
      setLatest(record);
      setTelemetry((prev) => [...prev.slice(-99), record]);
    } else if (lastMessage.type === 'history') {
      setTelemetry(lastMessage.data);
    }
  }, [lastMessage]);

  const sendCommand = (action) => {
    axios.post(`${API_URL}/command`, { robot_id: 'lfr_001', action, params: {} })
      .catch((err) => console.error('Command failed:', err));
  };

  const stats = latest ? [
    {
      label: 'Line State',
      value: latest.line_state?.replace('_', ' ') ?? '--',
      color: latest.line_state === 'lost_line' ? '#ff7d72' : latest.line_state === 'on_line' ? '#79e49d' : '#ffb44d',
    },
    { label: 'PID Error', value: latest.pid_error?.toFixed(2) ?? '--', color: '#72c7ff' },
    { label: 'Motor L / R', value: `${latest.motor_left} / ${latest.motor_right}`, color: '#1ed0b5' },
    { label: 'Battery', value: `${latest.battery_pct?.toFixed(0)}%`, color: latest.battery_pct < 20 ? '#ff7d72' : '#79e49d' },
    { label: 'Distance', value: `${latest.distance_cm?.toFixed(0)} cm`, color: '#ffb44d' },
  ] : [];

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <section className="dashboard-banner panel">
          <div className="page-header">
            <div>
              <span className="eyebrow">Live Monitoring</span>
              <h1 className="page-title" style={{ marginTop: '16px' }}>Real-time robot telemetry and command orchestration.</h1>
              <p className="page-subtitle" style={{ marginTop: '12px', maxWidth: '56ch' }}>
                Watch the edge stream update in real time, inspect AI insight summaries, and dispatch commands back to the robot.
              </p>
            </div>
            <span className="floating-tag" style={{ color: connected ? '#79e49d' : '#ff7d72' }}>
              {connected ? 'Live WebSocket Connected' : 'WebSocket Disconnected'}
            </span>
          </div>
        </section>

        {latest && (
          <section className="metric-grid">
            {stats.map((stat) => (
              <article key={stat.label} className="metric-card panel">
                <div className="metric-label">{stat.label}</div>
                <div className="metric-value" style={{ color: stat.color }}>{stat.value}</div>
              </article>
            ))}
          </section>
        )}

        <IRSensors sensors={latest?.ir_sensors} />

        <section className="dashboard-grid">
          <TelemetryChart data={telemetry} />
          <ControlPanel onCommand={sendCommand} />
        </section>

        <AIInsights latest={latest} />
      </main>
    </div>
  );
}
