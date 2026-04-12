import { useState, useEffect, useRef } from 'react';

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D'];

export default function SurveillanceDashboard({ deviceName }) {
  const [sim, setSim] = useState({
    motionDetected: false, activeZone: 'Zone A', battery: 88,
    uptimeMin: 0, alertCount: 0, cameraOnline: true,
    temperature: 32, lastMotion: '--',
  });
  const tickRef = useRef(0);
  const battRef = useRef(88);
  const uptimeRef = useRef(0);
  const alertRef = useRef(0);

  useEffect(() => {
    const tick = setInterval(() => {
      tickRef.current += 1;
      uptimeRef.current += 1;
      battRef.current = Math.max(0, battRef.current - 0.01);

      const motion = Math.random() < 0.15;
      if (motion) alertRef.current += 1;

      const zoneIndex = Math.floor(tickRef.current / 30) % ZONES.length;

      setSim((prev) => ({
        ...prev,
        motionDetected: motion,
        activeZone: ZONES[zoneIndex],
        battery: Math.round(battRef.current),
        uptimeMin: uptimeRef.current,
        alertCount: alertRef.current,
        temperature: Math.round((32 + Math.random() * 3) * 10) / 10,
        lastMotion: motion ? new Date().toLocaleTimeString() : prev.lastMotion,
      }));
    }, 1000);
    return () => clearInterval(tick);
  }, []);

  const uptimeStr = `${Math.floor(sim.uptimeMin / 60)}h ${sim.uptimeMin % 60}m`;

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)' }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Simulation</span>
        <h3 style={{ margin: '6px 0 0', color: '#cde0df' }}>{deviceName || 'Surveillance Robot'}</h3>
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '12px 18px', border: `1.5px solid ${sim.motionDetected ? '#ff7d72' : '#79e49d'}44`, marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sim.motionDetected ? '#ff7d72' : '#79e49d', boxShadow: `0 0 8px ${sim.motionDetected ? '#ff7d72' : '#79e49d'}` }} />
          <span style={{ color: sim.motionDetected ? '#ff7d72' : '#79e49d', fontWeight: '600' }}>
            {sim.motionDetected ? 'Motion Detected' : 'Area Clear'}
          </span>
        </div>
        <span style={{ fontSize: '12px', color: '#7fa1a6' }}>Patrolling {sim.activeZone}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Camera', value: sim.cameraOnline ? 'Online' : 'Offline', color: sim.cameraOnline ? '#79e49d' : '#ff7d72' },
          { label: 'Battery', value: `${sim.battery}%`, color: sim.battery < 20 ? '#ff7d72' : '#79e49d' },
          { label: 'Alerts', value: sim.alertCount, color: sim.alertCount > 5 ? '#ff7d72' : '#ffb44d' },
          { label: 'Uptime', value: uptimeStr, color: '#72c7ff' },
          { label: 'Temp', value: `${sim.temperature}°C`, color: sim.temperature > 40 ? '#ff7d72' : '#1ed0b5' },
          { label: 'Last Motion', value: sim.lastMotion, color: '#a78bfa' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: '18px', fontWeight: '700', color: m.color, marginTop: '6px' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Patrol Zones</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {ZONES.map((z) => (
            <div key={z} style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
              background: sim.activeZone === z ? 'rgba(30,208,181,0.15)' : '#111',
              border: `1.5px solid ${sim.activeZone === z ? '#1ed0b5' : '#2a2d3a'}`,
              color: sim.activeZone === z ? '#1ed0b5' : '#555',
            }}>{z}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
