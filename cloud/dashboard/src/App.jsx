import { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import TelemetryChart from './components/TelemetryChart';
import ControlPanel from './components/ControlPanel';
import AIInsights from './components/AIInsights';
import IRSensors from './components/IRSensors';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export default function App() {
  const [telemetry, setTelemetry] = useState([]);
  const [latest, setLatest] = useState(null);
  const { lastMessage, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    axios.get(`${API_URL}/telemetry/history?limit=60`)
      .then(res => setTelemetry(res.data.data))
      .catch(err => console.error('History load failed:', err));
  }, []);

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === 'telemetry') {
      const record = lastMessage.data;
      setLatest(record);
      setTelemetry(prev => [...prev.slice(-99), record]);
    } else if (lastMessage.type === 'history') {
      setTelemetry(lastMessage.data);
    }
  }, [lastMessage]);

  const sendCommand = (action) => {
    axios.post(`${API_URL}/command`, {
      robot_id: 'lfr_001',
      action,
      params: {}
    }).catch(err => console.error('Command failed:', err));
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px', background: '#0f1117', minHeight: '100vh', color: '#eee' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '22px' }}>Mini ROS Cloud Dashboard — LFR</h1>
        <span style={{
          padding: '4px 14px',
          borderRadius: '20px',
          background: connected ? '#1a3d2b' : '#3d1a1a',
          color: connected ? '#4ade80' : '#f87171',
          fontSize: '13px'
        }}>
          {connected ? '● Live' : '○ Disconnected'}
        </span>
      </div>

      {/* LFR Stats row */}
      {latest && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            {
              label: 'Line State',
              value: latest.line_state?.replace('_', ' ') ?? '—',
              color: latest.line_state === 'lost_line' ? '#f87171'
                   : latest.line_state === 'on_line'   ? '#4ade80' : '#fbbf24'
            },
            { label: 'PID Error', value: latest.pid_error?.toFixed(2) ?? '—', color: '#60a5fa' },
            { label: 'Motor L / R', value: `${latest.motor_left} / ${latest.motor_right}`, color: '#a78bfa' },
            {
              label: 'Battery',
              value: `${latest.battery_pct?.toFixed(0)}%`,
              color: latest.battery_pct < 20 ? '#f87171' : '#4ade80'
            },
            { label: 'Distance', value: `${latest.distance_cm?.toFixed(0)} cm`, color: '#fbbf24' },
          ].map(stat => (
            <div key={stat.label} style={{ background: '#1e2130', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>{stat.label}</div>
              <div style={{ fontSize: '20px', fontWeight: '600', color: stat.color }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* IR Sensor Strip */}
      <IRSensors sensors={latest?.ir_sensors} />

      {/* Charts and controls */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <TelemetryChart data={telemetry} />
        <ControlPanel onCommand={sendCommand} />
      </div>

      <AIInsights latest={latest} />
    </div>
  );
}