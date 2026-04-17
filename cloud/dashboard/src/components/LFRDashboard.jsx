import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

const DEFAULT = {
  sensors: [0, 0, 0, 0, 0],
  lineState: '—',
  pidError: 0,
  battery: 0,
  distanceCm: 0,
  lap: 0,
};

export default function LFRDashboard({ deviceName }) {
  const [data, setData] = useState(DEFAULT);
  const [hasData, setHasData] = useState(false);
  const { lastMessage, connected } = useWebSocket(WS_URL);

  useEffect(() => {
    if (!lastMessage) return;
    const { type, data: d } = lastMessage;
    if (type === 'telemetry' && d?.ir_sensors) {
      setData({
        sensors: d.ir_sensors ?? [0, 0, 0, 0, 0],
        lineState: d.line_state ?? '—',
        pidError: d.pid_error ?? 0,
        battery: d.battery_pct ?? 0,
        distanceCm: d.distance_cm ?? 0,
        lap: d.lap_count ?? 0,
      });
      setHasData(true);
    }
  }, [lastMessage]);

  const stateColor = data.lineState === 'on_line' ? '#79e49d'
    : data.lineState === 'lost_line' ? '#ff7d72' : '#ffb44d';

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)' }}>
      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Live Data
          </span>
          <h3 style={{ margin: '6px 0 0', color: '#cde0df' }}>{deviceName || 'LFR Robot'}</h3>
        </div>
        <div style={{
          fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
          background: connected ? 'rgba(121,228,157,0.15)' : 'rgba(255,125,114,0.15)',
          color: connected ? '#79e49d' : '#ff7d72',
          border: `1px solid ${connected ? '#79e49d33' : '#ff7d7233'}`,
        }}>
          {connected ? (hasData ? 'Live' : 'Connected — waiting for NodeMCU') : 'Disconnected'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Line State', value: String(data.lineState).replace('_', ' '), color: stateColor },
          { label: 'PID Error', value: Number(data.pidError).toFixed(2), color: '#72c7ff' },
          { label: 'Battery', value: `${Number(data.battery).toFixed(1)}%`, color: data.battery < 20 ? '#ff7d72' : '#79e49d' },
          { label: 'Distance', value: `${Number(data.distanceCm).toFixed(0)} cm`, color: '#ffb44d' },
          { label: 'Lap', value: data.lap, color: '#a78bfa' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: m.color, marginTop: '6px' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>IR Sensor Array</div>
        {!hasData && (
          <div style={{ textAlign: 'center', color: '#555', fontSize: '13px', padding: '8px 0' }}>
            Waiting for sensor data from NodeMCU...
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {data.sensors.map((val, i) => (
            <div key={i} style={{
              width: '48px', height: '48px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: '700', fontSize: '13px',
              background: val ? 'rgba(30,208,181,0.18)' : '#111',
              border: `1.5px solid ${val ? '#1ed0b5' : '#2a2d3a'}`,
              color: val ? '#1ed0b5' : '#444',
            }}>S{i}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
