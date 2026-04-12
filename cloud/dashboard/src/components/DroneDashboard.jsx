import { useState, useEffect, useRef } from 'react';

const FLIGHT_STATES = ['idle', 'ascending', 'cruising', 'hovering', 'descending', 'landing'];

export default function DroneDashboard({ deviceName }) {
  const [sim, setSim] = useState({
    altitude: 0, speed: 0, heading: 0, battery: 92,
    flightState: 'idle', distanceM: 0, gpsLat: 28.6139, gpsLng: 77.2090,
    signalStrength: 98,
  });
  const stateRef = useRef(0);
  const tickRef = useRef(0);
  const battRef = useRef(92);

  useEffect(() => {
    const tick = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;

      setSim((prev) => {
        const ns = { ...prev };
        battRef.current = Math.max(0, battRef.current - 0.03);
        ns.battery = Math.round(battRef.current);

        const cycle = t % 200;
        if (cycle < 30) { ns.flightState = 'ascending'; ns.altitude = Math.min(120, ns.altitude + 2); ns.speed = 0; }
        else if (cycle < 120) { ns.flightState = 'cruising'; ns.altitude += (Math.random() * 2 - 1); ns.speed = 8 + Math.random() * 4; ns.heading = (ns.heading + 2) % 360; ns.distanceM += ns.speed * 0.5; ns.gpsLat += 0.00003; ns.gpsLng += 0.00002; }
        else if (cycle < 140) { ns.flightState = 'hovering'; ns.speed = 0; ns.altitude += (Math.random() * 0.4 - 0.2); }
        else if (cycle < 180) { ns.flightState = 'descending'; ns.altitude = Math.max(0, ns.altitude - 2); ns.speed = 0; }
        else { ns.flightState = 'landing'; ns.altitude = 0; ns.speed = 0; }

        ns.altitude = Math.max(0, Math.round(ns.altitude * 10) / 10);
        ns.signalStrength = Math.max(60, Math.min(100, ns.signalStrength + (Math.random() * 4 - 2)));

        return ns;
      });
    }, 500);
    return () => clearInterval(tick);
  }, []);

  const stateColor = { idle: '#7fa1a6', ascending: '#79e49d', cruising: '#72c7ff', hovering: '#ffb44d', descending: '#ffb44d', landing: '#ff7d72' };
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dir = dirs[Math.round(sim.heading / 45) % 8];

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)' }}>
      <div style={{ marginBottom: '16px' }}>
        <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Live Simulation</span>
        <h3 style={{ margin: '6px 0 0', color: '#cde0df' }}>{deviceName || 'Drone'}</h3>
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '12px 18px', border: `1.5px solid ${stateColor[sim.flightState]}44`, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: stateColor[sim.flightState], boxShadow: `0 0 8px ${stateColor[sim.flightState]}` }} />
        <span style={{ color: stateColor[sim.flightState], fontWeight: '600', textTransform: 'capitalize' }}>{sim.flightState}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        {[
          { label: 'Altitude', value: `${sim.altitude} m`, color: '#72c7ff' },
          { label: 'Speed', value: `${sim.speed.toFixed(1)} m/s`, color: '#79e49d' },
          { label: 'Heading', value: `${sim.heading.toFixed(0)}° ${dir}`, color: '#ffb44d' },
          { label: 'Battery', value: `${sim.battery}%`, color: sim.battery < 20 ? '#ff7d72' : '#79e49d' },
          { label: 'Distance', value: `${sim.distanceM.toFixed(0)} m`, color: '#a78bfa' },
          { label: 'Signal', value: `${sim.signalStrength.toFixed(0)}%`, color: sim.signalStrength < 70 ? '#ff7d72' : '#1ed0b5' },
        ].map((m) => (
          <div key={m.label} style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{m.label}</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: m.color, marginTop: '6px' }}>{m.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>GPS Position</div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div><span style={{ color: '#7fa1a6', fontSize: '12px' }}>LAT </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLat.toFixed(5)}</span></div>
          <div><span style={{ color: '#7fa1a6', fontSize: '12px' }}>LNG </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLng.toFixed(5)}</span></div>
        </div>
      </div>
    </div>
  );
}
