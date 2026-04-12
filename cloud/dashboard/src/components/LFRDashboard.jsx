import { useState, useEffect, useRef } from 'react';

const SEQ = [2, 0, 1, 3, 4];
const STATES = ['on_line', 'slight_left', 'slight_right', 'sharp_left', 'sharp_right', 'lost_line'];

export default function LFRDashboard({ deviceName }) {
  const [sim, setSim] = useState({
    sensors: [0, 0, 1, 0, 0],
    lineState: 'on_line',
    pidError: 0,
    battery: 85,
    distanceCm: 0,
    lap: 0,
  });
  const seqRef = useRef(0);
  const battRef = useRef(7400);
  const distRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      const pos = SEQ[seqRef.current % SEQ.length];
      seqRef.current += 1;

      const sensors = [0, 0, 0, 0, 0];
      sensors[pos] = 1;

      const weights = [-2, -1, 0, 1, 2];
      const pidError = weights[pos];

      let lineState;
      if (pos === 2) lineState = 'on_line';
      else if (pos === 1) lineState = 'slight_left';
      else if (pos === 3) lineState = 'slight_right';
      else if (pos === 0) lineState = 'sharp_left';
      else lineState = 'sharp_right';

      battRef.current = Math.max(6000, battRef.current - Math.random() * 1.2);
      const battery = Math.round((battRef.current - 6000) / (8400 - 6000) * 100);

      distRef.current += Math.random() * 1.5 + 0.5;
      const lap = Math.floor(distRef.current / 500);

      setSim({ sensors, lineState, pidError, battery, distanceCm: distRef.current, lap });
    }, 200);
    return () => clearInterval(tick);
  }, []);

  const stateColor = sim.lineState === 'on_line' ? '#79e49d'
    : sim.lineState === 'lost_line' ? '#ff7d72' : '#ffb44d';

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)' }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Simulation</span>
        <h3 style={{ margin: '6px 0 0', color: '#cde0df' }}>{deviceName || 'LFR Robot'}</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Line State', value: sim.lineState.replace('_', ' '), color: stateColor },
          { label: 'PID Error', value: sim.pidError.toFixed(2), color: '#72c7ff' },
          { label: 'Battery', value: `${sim.battery}%`, color: sim.battery < 20 ? '#ff7d72' : '#79e49d' },
          { label: 'Distance', value: `${sim.distanceCm.toFixed(0)} cm`, color: '#ffb44d' },
          { label: 'Lap', value: sim.lap, color: '#a78bfa' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: m.color, marginTop: '6px' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>IR Sensor Array</div>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {sim.sensors.map((val, i) => (
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
