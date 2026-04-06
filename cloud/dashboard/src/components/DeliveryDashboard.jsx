import { useState, useEffect, useRef } from 'react';

// ── Fake data generator (mirrors delivery_robot_publisher.py logic) ───────────

const STATES = ['idle', 'en_route_pickup', 'at_pickup', 'en_route_dropoff', 'at_dropoff', 'returning'];
const TRANSITIONS = {
  idle:             { min: 10, max: 18, next: 'en_route_pickup',  cargo: false },
  en_route_pickup:  { min: 22, max: 35, next: 'at_pickup',        cargo: false },
  at_pickup:        { min:  5, max:  9, next: 'en_route_dropoff', cargo: true  },
  en_route_dropoff: { min: 22, max: 35, next: 'at_dropoff',       cargo: true  },
  at_dropoff:       { min:  5, max:  9, next: 'returning',        cargo: false },
  returning:        { min: 18, max: 28, next: 'idle',             cargo: false },
};

function createSimState() {
  return {
    status: 'idle', cargo: false, stateTicks: 0,
    stateLimit: 12, missionCount: 0,
    lat: 37.7749, lng: -122.4194,
    heading: 0, speed: 0, distance: 0,
    battery: 100, motorTemp: 28,
    wLeft: 0, wRight: 0,
    obstacleCm: 300, obstacleTimer: 0,
  };
}

function simTick(s) {
  const ns = { ...s };
  const moving = ['en_route_pickup', 'en_route_dropoff', 'returning'].includes(ns.status);

  // State machine
  ns.stateTicks++;
  if (ns.stateTicks >= ns.stateLimit) {
    const t = TRANSITIONS[ns.status];
    if (t.next === 'idle') ns.missionCount++;
    ns.status = t.next;
    ns.cargo = t.cargo;
    const { min, max } = TRANSITIONS[t.next];
    ns.stateLimit = min + Math.floor(Math.random() * (max - min));
    ns.stateTicks = 0;
  }

  // Physics
  if (moving) {
    const target = 1.4 + (Math.random() * 0.4 - 0.2);
    ns.speed = Math.min(target, ns.speed + Math.random() * 0.12 + 0.04);
    const baseRpm = Math.round(ns.speed * 80);
    ns.wLeft  = baseRpm + Math.round(Math.random() * 10 - 5);
    ns.wRight = baseRpm + Math.round(Math.random() * 10 - 5);
    ns.heading = (ns.heading + (Math.random() * 6 - 3) + 360) % 360;
    const dLat = Math.cos(ns.heading * Math.PI / 180) * ns.speed * 0.5 * 9e-6;
    const dLng = Math.sin(ns.heading * Math.PI / 180) * ns.speed * 0.5 * 9e-6;
    ns.lat += dLat; ns.lng += dLng;
    ns.distance += ns.speed * 0.5;
    ns.battery = Math.max(0, ns.battery - 0.015);
    ns.motorTemp = Math.min(75, ns.motorTemp + Math.random() * 0.04 + 0.01);
  } else {
    ns.speed = Math.max(0, ns.speed - 0.15);
    ns.wLeft = Math.max(0, Math.round(ns.wLeft * 0.85));
    ns.wRight = Math.max(0, Math.round(ns.wRight * 0.85));
    ns.battery = Math.max(0, ns.battery - 0.002);
    ns.motorTemp = Math.max(28, ns.motorTemp - Math.random() * 0.06);
  }
  ns.motorTemp += (Math.random() * 0.4 - 0.2);

  // Obstacle
  ns.obstacleTimer++;
  if (ns.obstacleTimer > 20 + Math.round(Math.random() * 20)) {
    ns.obstacleCm = 30 + Math.round(Math.random() * 60);
    ns.obstacleTimer = 0;
  } else if (ns.obstacleCm < 100) {
    ns.obstacleCm = Math.min(300, ns.obstacleCm + Math.round(Math.random() * 25 + 10));
  } else {
    ns.obstacleCm = 300 + Math.round(Math.random() * 40 - 20);
  }

  return ns;
}

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_META = {
  idle:             { label: 'Idle',              color: '#888',    bg: '#1a1a2e' },
  en_route_pickup:  { label: 'En Route: Pickup',  color: '#60a5fa', bg: '#1a2d4a' },
  at_pickup:        { label: 'At Pickup',         color: '#fbbf24', bg: '#2a2010' },
  en_route_dropoff: { label: 'En Route: Dropoff', color: '#a78bfa', bg: '#201a3a' },
  at_dropoff:       { label: 'At Dropoff',        color: '#4ade80', bg: '#0f2a1a' },
  returning:        { label: 'Returning to Base', color: '#fb923c', bg: '#2a1a0f' },
};

function statusMeta(s) {
  return STATUS_META[s] || { label: s, color: '#888', bg: '#1e2130' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, unit, color, sub }) {
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: color || '#eee' }}>
        {value}<span style={{ fontSize: '13px', color: '#666', marginLeft: '4px' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function BatteryBar({ pct }) {
  const color = pct > 50 ? '#4ade80' : pct > 20 ? '#fbbf24' : '#f87171';
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>Battery</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color, marginBottom: '8px' }}>{pct.toFixed(1)}<span style={{ fontSize: '13px', color: '#666', marginLeft: '4px' }}>%</span></div>
      <div style={{ height: '6px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

function ObstacleRadar({ cm }) {
  const danger = cm < 60;
  const warn   = cm < 120;
  const color  = danger ? '#f87171' : warn ? '#fbbf24' : '#4ade80';
  const label  = danger ? 'DANGER' : warn ? 'WARNING' : 'Clear';
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: `1px solid ${color}55`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Obstacle Sensor</div>
      <div style={{ fontSize: '32px' }}>{danger ? '🚨' : warn ? '⚠️' : '✅'}</div>
      <div style={{ fontSize: '20px', fontWeight: '700', color }}>{cm} <span style={{ fontSize: '12px', color: '#666' }}>cm</span></div>
      <div style={{ fontSize: '11px', fontWeight: '600', color, background: color + '22', padding: '2px 10px', borderRadius: '12px' }}>{label}</div>
    </div>
  );
}

function WheelSpeeds({ left, right }) {
  const max = 120;
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Wheel Speeds (RPM)</div>
      {[['L', left, '#60a5fa'], ['R', right, '#a78bfa']].map(([side, rpm, col]) => (
        <div key={side} style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '12px' }}>
            <span style={{ color: '#888' }}>{side}</span>
            <span style={{ color: col, fontWeight: '600' }}>{rpm}</span>
          </div>
          <div style={{ height: '5px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${Math.min(100, (rpm / max) * 100)}%`, height: '100%', background: col, borderRadius: '3px', transition: 'width 0.4s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function GPSCard({ lat, lng, heading }) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const dir = dirs[Math.round(heading / 45) % 8];
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>GPS Position</div>
      <div style={{ fontFamily: 'monospace', fontSize: '13px', color: '#4ade80', marginBottom: '4px' }}>{lat.toFixed(6)}, {lng.toFixed(6)}</div>
      <div style={{ fontSize: '12px', color: '#888' }}>
        Heading: <span style={{ color: '#fbbf24', fontWeight: '600' }}>{heading.toFixed(0)}° {dir}</span>
      </div>
    </div>
  );
}

function MissionLog({ count, status, cargo }) {
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>Mission</div>
      <div style={{ fontSize: '26px', fontWeight: '700', color: '#a78bfa', marginBottom: '8px' }}>{count} <span style={{ fontSize: '13px', color: '#666' }}>completed</span></div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '12px', background: cargo ? '#1a3d2b' : '#1a1a2e', color: cargo ? '#4ade80' : '#555' }}>
          {cargo ? '📦 Cargo Loaded' : '📭 No Cargo'}
        </span>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DeliveryDashboard({ deviceName }) {
  const [sim, setSim] = useState(createSimState);
  const [history, setHistory] = useState([]);
  const simRef = useRef(sim);

  useEffect(() => {
    simRef.current = sim;
    setHistory(h => {
      const next = [...h, { ...sim, time: Date.now() }].slice(-60);
      return next;
    });
  }, [sim]);

  useEffect(() => {
    const id = setInterval(() => {
      setSim(prev => simTick(prev));
    }, 500);
    return () => clearInterval(id);
  }, []);

  const meta = statusMeta(sim.status);

  return (
    <div style={{ fontFamily: 'sans-serif', color: '#eee' }}>

      {/* Status banner */}
      <div style={{
        background: meta.bg, border: `1px solid ${meta.color}44`,
        borderRadius: '12px', padding: '16px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px',
      }}>
        <div>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
            {deviceName || 'Delivery Robot'}  •  ADR-001
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: meta.color }}>{meta.label}</div>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {sim.eta_seconds > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#666' }}>ETA</div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#fbbf24' }}>{sim.eta_seconds}s</div>
            </div>
          )}
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Speed" value={sim.speed.toFixed(2)} unit="m/s" color="#60a5fa" />
        <BatteryBar pct={sim.battery} />
        <StatCard label="Distance" value={sim.distance.toFixed(1)} unit="m" color="#a78bfa" />
        <StatCard label="Motor Temp" value={sim.motorTemp.toFixed(1)} unit="°C"
          color={sim.motorTemp > 65 ? '#f87171' : sim.motorTemp > 50 ? '#fbbf24' : '#4ade80'} />
      </div>

      {/* Detail row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <GPSCard lat={sim.lat} lng={sim.lng} heading={sim.heading} />
        <ObstacleRadar cm={sim.obstacleCm} />
        <WheelSpeeds left={sim.wLeft} right={sim.wRight} />
        <MissionLog count={sim.missionCount} status={sim.status} cargo={sim.cargo} />
      </div>

      {/* Speed history sparkline */}
      <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '12px' }}>Speed History (last 60 ticks)</div>
        <svg width="100%" height="60" viewBox={`0 0 ${history.length} 60`} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke="#60a5fa"
            strokeWidth="1.5"
            points={history.map((h, i) => `${i},${60 - (h.speed / 2) * 60}`).join(' ')}
          />
        </svg>
      </div>
    </div>
  );
}
