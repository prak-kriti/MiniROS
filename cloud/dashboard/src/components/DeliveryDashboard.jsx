import { useState, useEffect, useRef } from 'react';
import CameraModule from './CameraModule';

// ─────────────────────────────────────────────
// SIMULATION STATE MACHINE
// ─────────────────────────────────────────────

const TRANSITIONS = {
  idle:             { min: 10, max: 18, next: 'en_route_pickup',  cargo: false },
  en_route_pickup:  { min: 22, max: 35, next: 'at_pickup',        cargo: false },
  at_pickup:        { min:  5, max:  9, next: 'en_route_dropoff', cargo: true  },
  en_route_dropoff: { min: 22, max: 35, next: 'at_dropoff',       cargo: true  },
  at_dropoff:       { min:  5, max:  9, next: 'returning',        cargo: false },
  returning:        { min: 18, max: 28, next: 'idle',             cargo: false },
};

const STATUS_META = {
  idle:             { label: 'Idle',              color: '#888',    bg: '#1a1a2e' },
  en_route_pickup:  { label: 'En Route: Pickup',  color: '#60a5fa', bg: '#1a2d4a' },
  at_pickup:        { label: 'At Pickup',         color: '#fbbf24', bg: '#2a2010' },
  en_route_dropoff: { label: 'En Route: Dropoff', color: '#a78bfa', bg: '#201a3a' },
  at_dropoff:       { label: 'At Dropoff',        color: '#4ade80', bg: '#0f2a1a' },
  returning:        { label: 'Returning to Base', color: '#fb923c', bg: '#2a1a0f' },
};

const OBJECT_LABELS = ['person', 'vehicle', 'box', 'bicycle', 'dog', null, null, null];
const PICKUP_LOC  = { lat: 28.6180, lng: 77.2100, label: 'Warehouse A, Sector 4' };
const DROPOFF_LOC = { lat: 28.6050, lng: 77.2250, label: 'Shop 12, Market St' };

function genTaskId() {
  return 'TASK-' + Math.random().toString(36).slice(2, 8).toUpperCase();
}

function uniqueKey(deviceId, userId) {
  const raw = `${deviceId}-${userId}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  return `ADR-${hash.toString(16).toUpperCase().padStart(8, '0')}`;
}

function createSimState() {
  return {
    // State machine
    status: 'idle', cargo: false, stateTicks: 0, stateLimit: 12, missionCount: 0,

    // Position
    lat: 28.6139, lng: 77.2090, heading: 0, distance: 0,

    // Motor
    speed: 0, leftWheelRpm: 0, rightWheelRpm: 0,
    motorStatus: 'off', brakeStatus: false, steeringAngle: 0,
    motorTemp: 28,

    // Battery
    battery: 100, batteryVoltage: 12.6, batteryCurrent: 0,
    batteryTemp: 31, powerConsumption: 0, chargingStatus: 'discharging',

    // Sensors
    lidarArray: Array(8).fill(400),
    ultrasonicFront: 300, ultrasonicLeft: 300, ultrasonicRight: 300,
    obstacleDetected: false,

    // Vision
    cameraStatus: 'online', frameId: 0, objectDetected: null,

    // System health
    cpuUsage: 42, memUsage: 55, cpuTemp: 42,
    networkLatency: 18, signalStrength: 95, uptimeSec: 0,

    // Task
    taskId: genTaskId(), taskStatus: 'pending',
    loadWeight: 0, etaSec: 0, deliveryTimeActual: null,
  };
}

function simTick(s) {
  const ns = { ...s };
  const moving = ['en_route_pickup', 'en_route_dropoff', 'returning'].includes(ns.status);

  // State machine
  ns.stateTicks++;
  ns.uptimeSec++;
  if (ns.stateTicks >= ns.stateLimit) {
    const t = TRANSITIONS[ns.status];
    if (t.next === 'idle') { ns.missionCount++; ns.taskId = genTaskId(); ns.taskStatus = 'completed'; ns.deliveryTimeActual = new Date().toLocaleTimeString(); }
    if (t.next === 'en_route_pickup') { ns.taskStatus = 'active'; ns.loadWeight = 0; }
    if (t.next === 'at_pickup')       { ns.loadWeight = +(1 + Math.random() * 4).toFixed(1); }
    if (t.next === 'at_dropoff')      { ns.taskStatus = 'completed'; }
    ns.status = t.next;
    ns.cargo  = t.cargo;
    const { min, max } = TRANSITIONS[t.next];
    ns.stateLimit = min + Math.floor(Math.random() * (max - min));
    ns.stateTicks = 0;
  }

  // Physics
  if (moving) {
    const target = 1.4 + (Math.random() * 0.4 - 0.2);
    ns.speed = Math.min(target, ns.speed + Math.random() * 0.12 + 0.04);
    const baseRpm = Math.round(ns.speed * 80);
    ns.leftWheelRpm  = baseRpm + Math.round(Math.random() * 10 - 5);
    ns.rightWheelRpm = baseRpm + Math.round(Math.random() * 10 - 5);
    ns.motorStatus   = 'on';
    ns.brakeStatus   = false;
    ns.steeringAngle = Math.round(Math.random() * 20 - 10);
    ns.heading = (ns.heading + (Math.random() * 6 - 3) + 360) % 360;
    const dLat = Math.cos(ns.heading * Math.PI / 180) * ns.speed * 0.5 * 9e-6;
    const dLng = Math.sin(ns.heading * Math.PI / 180) * ns.speed * 0.5 * 9e-6;
    ns.lat += dLat; ns.lng += dLng;
    ns.distance += ns.speed * 0.5;
    ns.motorTemp = Math.min(75, ns.motorTemp + Math.random() * 0.04 + 0.01);
    ns.battery   = Math.max(0, ns.battery - 0.015);
    ns.batteryVoltage   = Math.max(10.5, 12.6 - ((100 - ns.battery) / 100) * 2.1);
    ns.batteryCurrent   = +(3 + Math.random() * 3).toFixed(2);
    ns.batteryTemp      = Math.min(45, ns.batteryTemp + Math.random() * 0.02);
    ns.powerConsumption = +(ns.batteryVoltage * ns.batteryCurrent).toFixed(1);
    ns.etaSec = Math.max(0, Math.round((ns.stateLimit - ns.stateTicks) * 0.5 * 10));
  } else {
    ns.speed         = Math.max(0, ns.speed - 0.15);
    ns.leftWheelRpm  = Math.max(0, Math.round(ns.leftWheelRpm  * 0.85));
    ns.rightWheelRpm = Math.max(0, Math.round(ns.rightWheelRpm * 0.85));
    ns.motorStatus   = ns.status === 'idle' ? 'off' : 'on';
    ns.brakeStatus   = ns.speed < 0.1;
    ns.steeringAngle = 0;
    ns.battery       = Math.max(0, ns.battery - 0.002);
    ns.batteryVoltage    = Math.max(10.5, 12.6 - ((100 - ns.battery) / 100) * 2.1);
    ns.batteryCurrent    = +(0.5 + Math.random() * 0.5).toFixed(2);
    ns.batteryTemp       = Math.max(29, ns.batteryTemp - Math.random() * 0.03);
    ns.powerConsumption  = +(ns.batteryVoltage * ns.batteryCurrent).toFixed(1);
    ns.motorTemp     = Math.max(28, ns.motorTemp - Math.random() * 0.06);
    ns.etaSec        = 0;
  }
  ns.chargingStatus = ns.battery < 15 ? 'charging' : 'discharging';

  // Lidar array (8 directions, simplified)
  ns.lidarArray = ns.lidarArray.map((v) => {
    const spike = Math.random() < 0.05;
    return spike ? 30 + Math.round(Math.random() * 60) : Math.min(400, Math.max(30, v + Math.round(Math.random() * 20 - 10)));
  });

  // Ultrasonic
  if (Math.random() < 0.08) {
    ns.ultrasonicFront = 30 + Math.round(Math.random() * 80);
    ns.obstacleDetected = ns.ultrasonicFront < 60;
  } else {
    ns.ultrasonicFront = Math.min(300, ns.ultrasonicFront + Math.round(Math.random() * 15 + 5));
    ns.obstacleDetected = ns.ultrasonicFront < 60;
  }
  ns.ultrasonicLeft  = Math.min(300, Math.max(20, ns.ultrasonicLeft  + Math.round(Math.random() * 20 - 10)));
  ns.ultrasonicRight = Math.min(300, Math.max(20, ns.ultrasonicRight + Math.round(Math.random() * 20 - 10)));

  // Vision
  ns.frameId++;
  if (Math.random() < 0.05) ns.objectDetected = OBJECT_LABELS[Math.floor(Math.random() * OBJECT_LABELS.length)];

  // System health
  ns.cpuUsage      = Math.min(95, Math.max(20, ns.cpuUsage      + (Math.random() * 6 - 3)));
  ns.memUsage      = Math.min(90, Math.max(30, ns.memUsage      + (Math.random() * 2 - 1)));
  ns.cpuTemp       = Math.min(80, Math.max(38, ns.cpuTemp       + (Math.random() * 1 - 0.5)));
  ns.networkLatency= Math.min(120,Math.max(8,  ns.networkLatency+ (Math.random() * 10 - 5)));
  ns.signalStrength= Math.min(100,Math.max(40, ns.signalStrength + (Math.random() * 4 - 2)));

  return ns;
}

// ─────────────────────────────────────────────
// REUSABLE UI PRIMITIVES
// ─────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ fontSize: '11px', color: '#1ed0b5', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: '700', marginBottom: '10px', borderBottom: '1px solid #1ed0b522', paddingBottom: '6px' }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Card({ label, children, accent, style }) {
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: `1px solid ${accent || '#2a2d3a'}`, ...style }}>
      {label && <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>{label}</div>}
      {children}
    </div>
  );
}

function Val({ v, unit, color, size = '20px' }) {
  return (
    <span style={{ fontSize: size, fontWeight: '700', color: color || '#eee' }}>
      {v}<span style={{ fontSize: '11px', color: '#555', marginLeft: '3px' }}>{unit}</span>
    </span>
  );
}

function Bar({ pct, color, height = '5px' }) {
  return (
    <div style={{ height, background: '#111', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
      <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: color, borderRadius: '3px', transition: 'width 0.4s' }} />
    </div>
  );
}

function Pill({ label, color, bg }) {
  return (
    <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '12px', background: bg || color + '22', color, fontWeight: '600' }}>{label}</span>
  );
}

function Sparkline({ data, color, height = 50, maxVal }) {
  if (!data.length) return null;
  const max = maxVal || Math.max(...data, 1);
  const w = data.length;
  const pts = data.map((v, i) => `${i},${height - (v / max) * height}`).join(' ');
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={pts} />
    </svg>
  );
}

// ─────────────────────────────────────────────
// SMART MAP (SVG)
// ─────────────────────────────────────────────

// Pre-generate planned path waypoints (normalized 0-1 coords)
const PLANNED_PATH = [
  { x: 0.15, y: 0.85 }, { x: 0.20, y: 0.60 }, { x: 0.30, y: 0.45 },
  { x: 0.45, y: 0.35 }, { x: 0.60, y: 0.30 }, { x: 0.75, y: 0.40 },
  { x: 0.85, y: 0.55 }, { x: 0.80, y: 0.70 }, { x: 0.65, y: 0.78 },
];

const OBSTACLE_ZONES = [
  { x: 0.38, y: 0.50, r: 0.04 },
  { x: 0.62, y: 0.42, r: 0.03 },
  { x: 0.52, y: 0.68, r: 0.05 },
];

const HEATMAP_CELLS = [
  { x: 0.28, y: 0.42, intensity: 0.8 },
  { x: 0.44, y: 0.33, intensity: 0.6 },
  { x: 0.59, y: 0.28, intensity: 0.5 },
  { x: 0.74, y: 0.38, intensity: 0.7 },
];

const CONGESTION_ZONES = [
  { x: 0.35, y: 0.38, w: 0.12, h: 0.08 },
  { x: 0.70, y: 0.32, w: 0.10, h: 0.07 },
];

function SmartMap({ actualPath, robotX, robotY }) {
  const W = 500, H = 320;
  const px = (v) => v * W;
  const py = (v) => v * H;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ background: '#10131c', borderRadius: '10px', display: 'block' }}>
      {/* Grid */}
      {Array.from({ length: 11 }).map((_, i) => (
        <g key={i}>
          <line x1={px(i * 0.1)} y1={0} x2={px(i * 0.1)} y2={H} stroke="#1a1d2a" strokeWidth="1" />
          <line x1={0} y1={py(i * 0.1)} x2={W} y2={py(i * 0.1)} stroke="#1a1d2a" strokeWidth="1" />
        </g>
      ))}

      {/* Heatmap cells */}
      {HEATMAP_CELLS.map((c, i) => (
        <rect key={i} x={px(c.x - 0.06)} y={py(c.y - 0.06)} width={px(0.12)} height={py(0.12)}
          fill={`rgba(255,180,77,${c.intensity * 0.25})`} rx="4" />
      ))}

      {/* Congestion zones */}
      {CONGESTION_ZONES.map((z, i) => (
        <rect key={i} x={px(z.x)} y={py(z.y)} width={px(z.w)} height={py(z.h)}
          fill="rgba(251,191,36,0.10)" stroke="#fbbf2466" strokeWidth="1" rx="4" />
      ))}

      {/* Obstacle zones */}
      {OBSTACLE_ZONES.map((o, i) => (
        <circle key={i} cx={px(o.x)} cy={py(o.y)} r={px(o.r)}
          fill="rgba(248,113,113,0.15)" stroke="#f8717166" strokeWidth="1.5" />
      ))}

      {/* Planned path (dashed) */}
      <polyline
        fill="none" stroke="#1ed0b5" strokeWidth="1.5" strokeDasharray="6,4" opacity="0.45"
        points={PLANNED_PATH.map(p => `${px(p.x)},${py(p.y)}`).join(' ')} />

      {/* Actual path (solid) */}
      {actualPath.length > 1 && (
        <polyline fill="none" stroke="#60a5fa" strokeWidth="2" opacity="0.85"
          points={actualPath.map(p => `${px(p.x)},${py(p.y)}`).join(' ')} />
      )}

      {/* Pickup marker */}
      <circle cx={px(PLANNED_PATH[0].x)} cy={py(PLANNED_PATH[0].y)} r="7" fill="#fbbf24" opacity="0.9" />
      <text x={px(PLANNED_PATH[0].x) + 10} y={py(PLANNED_PATH[0].y) + 4} fill="#fbbf24" fontSize="10">Pickup</text>

      {/* Dropoff marker */}
      <circle cx={px(PLANNED_PATH[PLANNED_PATH.length - 1].x)} cy={py(PLANNED_PATH[PLANNED_PATH.length - 1].y)} r="7" fill="#4ade80" opacity="0.9" />
      <text x={px(PLANNED_PATH[PLANNED_PATH.length - 1].x) + 10} y={py(PLANNED_PATH[PLANNED_PATH.length - 1].y) + 4} fill="#4ade80" fontSize="10">Dropoff</text>

      {/* Robot position */}
      <circle cx={px(robotX)} cy={py(robotY)} r="7" fill="#60a5fa" />
      <circle cx={px(robotX)} cy={py(robotY)} r="12" fill="none" stroke="#60a5fa" strokeWidth="1.5" opacity="0.4" />

      {/* Legend */}
      <g transform={`translate(10, ${H - 60})`}>
        <rect width="130" height="58" rx="6" fill="#10131ccc" />
        <line x1="8" y1="12" x2="22" y2="12" stroke="#1ed0b5" strokeWidth="1.5" strokeDasharray="4,3" />
        <text x="26" y="16" fill="#9ca3af" fontSize="9">Planned path</text>
        <line x1="8" y1="26" x2="22" y2="26" stroke="#60a5fa" strokeWidth="2" />
        <text x="26" y="30" fill="#9ca3af" fontSize="9">Actual path</text>
        <circle cx="14" cy="40" r="4" fill="rgba(248,113,113,0.4)" stroke="#f87171" strokeWidth="1" />
        <text x="22" y="44" fill="#9ca3af" fontSize="9">Obstacle zone</text>
        <rect x="8" y="48" width="8" height="6" fill="rgba(251,191,36,0.2)" stroke="#fbbf24" strokeWidth="1" />
        <text x="22" y="54" fill="#9ca3af" fontSize="9">Congestion / heatmap</text>
      </g>
    </svg>
  );
}

// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────

export default function DeliveryDashboard({ deviceId, userId }) {
  const [sim, setSim]           = useState(createSimState);
  const [speedHist, setSpeedHist]   = useState([]);
  const [battHist, setBattHist]     = useState([]);
  const [lidarHist, setLidarHist]   = useState([]);
  const [actualPath, setActualPath] = useState([{ x: 0.15, y: 0.85 }]);
  const [robotPos, setRobotPos]     = useState({ x: 0.15, y: 0.85 });
  const pathOriginRef = useRef({ lat: 28.6139, lng: 77.2090 });

  const robotId = deviceId || 'ADR-001';
  const uid     = userId   || 'USR-000';
  const uKey    = uniqueKey(robotId, uid);

  useEffect(() => {
    setSpeedHist(h => [...h, sim.speed].slice(-60));
    setBattHist (h => [...h, sim.battery].slice(-60));
    setLidarHist(h => [...h, Math.min(...sim.lidarArray)].slice(-60));

    // Normalize GPS to map coords (0-1)
    const origin = pathOriginRef.current;
    const x = 0.15 + ((sim.lng - origin.lng) / 0.05) * 0.7;
    const y = 0.85 - ((sim.lat - origin.lat) / 0.05) * 0.7;
    const nx = Math.min(0.95, Math.max(0.05, x));
    const ny = Math.min(0.95, Math.max(0.05, y));
    setRobotPos({ x: nx, y: ny });
    setActualPath(p => [...p.slice(-80), { x: nx, y: ny }]);
  }, [sim]);

  useEffect(() => {
    const id = setInterval(() => setSim(prev => simTick(prev)), 500);
    return () => clearInterval(id);
  }, []);

  const meta      = STATUS_META[sim.status] || STATUS_META.idle;
  const uptime    = `${Math.floor(sim.uptimeSec / 3600)}h ${Math.floor((sim.uptimeSec % 3600) / 60)}m ${sim.uptimeSec % 60}s`;
  const motorColor = sim.motorStatus === 'fault' ? '#f87171' : sim.motorStatus === 'on' ? '#4ade80' : '#888';
  const batColor   = sim.battery > 50 ? '#4ade80' : sim.battery > 20 ? '#fbbf24' : '#f87171';
  const cpuColor   = sim.cpuUsage > 80 ? '#f87171' : sim.cpuUsage > 60 ? '#fbbf24' : '#4ade80';
  const memColor   = sim.memUsage > 80 ? '#f87171' : sim.memUsage > 60 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)', color: '#eee' }}>

      {/* ── IDENTITY BANNER ── */}
      <div style={{ background: '#1a1d28', border: '1px solid #2a2d3a', borderRadius: '12px', padding: '14px 20px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
        {[['Robot ID', robotId, '#1ed0b5'], ['User ID', uid, '#a78bfa'], ['Unique Key', uKey, '#ffb44d']].map(([l, v, c]) => (
          <div key={l}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{l}</div>
            <div style={{ fontFamily: 'monospace', color: c, fontWeight: '700', fontSize: '14px' }}>{v}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: meta.color, boxShadow: `0 0 8px ${meta.color}` }} />
          <span style={{ color: meta.color, fontWeight: '600' }}>{meta.label}</span>
        </div>
      </div>

      {/* ── MOTOR STATUS ── */}
      <Section title="Motor Status">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <Card label="Left Wheel">
            <Val v={sim.leftWheelRpm} unit="RPM" color="#60a5fa" />
            <Bar pct={(sim.leftWheelRpm / 120) * 100} color="#60a5fa" />
          </Card>
          <Card label="Right Wheel">
            <Val v={sim.rightWheelRpm} unit="RPM" color="#a78bfa" />
            <Bar pct={(sim.rightWheelRpm / 120) * 100} color="#a78bfa" />
          </Card>
          <Card label="Motor Status" accent={sim.motorStatus === 'fault' ? '#f8717144' : '#2a2d3a'}>
            <Pill label={sim.motorStatus.toUpperCase()} color={motorColor} />
            <div style={{ marginTop: '8px', fontSize: '12px', color: '#888' }}>
              Brake: <span style={{ color: sim.brakeStatus ? '#fbbf24' : '#4ade80', fontWeight: '600' }}>{sim.brakeStatus ? 'ENGAGED' : 'Released'}</span>
            </div>
          </Card>
          <Card label="Steering / Odometry">
            <div style={{ fontSize: '13px', color: '#888', marginBottom: '4px' }}>Angle: <span style={{ color: '#fbbf24', fontWeight: '700' }}>{sim.steeringAngle}°</span></div>
            <Val v={sim.distance.toFixed(1)} unit="m" color="#ffb44d" size="18px" />
            <div style={{ fontSize: '10px', color: '#555', marginTop: '2px' }}>odometry</div>
          </Card>
        </div>
      </Section>

      {/* ── BATTERY ── */}
      <Section title="Battery">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <Card label="Level">
            <Val v={sim.battery.toFixed(1)} unit="%" color={batColor} />
            <Bar pct={sim.battery} color={batColor} height="6px" />
          </Card>
          <Card label="Voltage / Current">
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: '#4ade80', fontWeight: '700' }}>{sim.batteryVoltage.toFixed(2)}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> V</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: '#60a5fa', fontWeight: '700' }}>{sim.batteryCurrent}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> A</span>
            </div>
          </Card>
          <Card label="Power / Temp">
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: '#fbbf24', fontWeight: '700' }}>{sim.powerConsumption}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> W</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: sim.batteryTemp > 40 ? '#f87171' : '#4ade80', fontWeight: '700' }}>{sim.batteryTemp.toFixed(1)}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> °C</span>
            </div>
          </Card>
          <Card label="Charging Status">
            <Pill
              label={sim.chargingStatus.toUpperCase()}
              color={sim.chargingStatus === 'charging' ? '#4ade80' : '#60a5fa'}
            />
          </Card>
        </div>
      </Section>

      {/* ── SENSORS ── */}
      <Section title="Sensor Data">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
          {[['Ultrasonic Front', sim.ultrasonicFront, '#72c7ff'], ['Ultrasonic Left', sim.ultrasonicLeft, '#a78bfa'], ['Ultrasonic Right', sim.ultrasonicRight, '#fbbf24']].map(([l, v, c]) => (
            <Card key={l} label={l} accent={v < 60 ? '#f8717144' : '#2a2d3a'}>
              <Val v={v} unit="cm" color={v < 60 ? '#f87171' : c} />
            </Card>
          ))}
          <Card label="Obstacle Detected" accent={sim.obstacleDetected ? '#f8717144' : '#2a2d3a'}>
            <Pill label={sim.obstacleDetected ? 'DETECTED' : 'CLEAR'} color={sim.obstacleDetected ? '#f87171' : '#4ade80'} />
          </Card>
        </div>

        {/* Lidar array visual */}
        <Card label="Lidar Distance Array (8-point)">
          <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-end', height: '60px' }}>
            {sim.lidarArray.map((v, i) => {
              const pct = Math.min(100, (v / 400) * 100);
              const color = v < 80 ? '#f87171' : v < 150 ? '#fbbf24' : '#1ed0b5';
              const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
              return (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                  <div style={{ width: '100%', height: `${pct * 0.5}px`, background: color, borderRadius: '3px 3px 0 0', transition: 'height 0.3s', minHeight: '4px' }} />
                  <span style={{ fontSize: '9px', color: '#555' }}>{dirs[i]}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </Section>

      {/* ── VISION ── */}
      <Section title="Vision">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <Card label="Camera Status">
            <Pill label={sim.cameraStatus.toUpperCase()} color={sim.cameraStatus === 'online' ? '#4ade80' : '#f87171'} />
          </Card>
          <Card label="Frame ID">
            <Val v={sim.frameId} color="#72c7ff" size="18px" />
          </Card>
          <Card label="Object Detected" accent={sim.objectDetected ? '#fbbf2444' : '#2a2d3a'}>
            {sim.objectDetected
              ? <Pill label={sim.objectDetected.toUpperCase()} color="#fbbf24" />
              : <span style={{ fontSize: '13px', color: '#444' }}>None</span>}
          </Card>
        </div>
      </Section>

      {/* ── SYSTEM HEALTH ── */}
      <Section title="System Health">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <Card label="CPU Usage">
            <Val v={sim.cpuUsage.toFixed(0)} unit="%" color={cpuColor} />
            <Bar pct={sim.cpuUsage} color={cpuColor} />
          </Card>
          <Card label="Memory Usage">
            <Val v={sim.memUsage.toFixed(0)} unit="%" color={memColor} />
            <Bar pct={sim.memUsage} color={memColor} />
          </Card>
          <Card label="CPU Temp">
            <Val v={sim.cpuTemp.toFixed(1)} unit="°C" color={sim.cpuTemp > 70 ? '#f87171' : '#4ade80'} />
          </Card>
          <Card label="Network">
            <div style={{ fontSize: '13px', marginBottom: '4px' }}>
              <span style={{ color: sim.networkLatency > 80 ? '#f87171' : '#4ade80', fontWeight: '700' }}>{sim.networkLatency.toFixed(0)}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> ms latency</span>
            </div>
            <div style={{ fontSize: '13px' }}>
              <span style={{ color: sim.signalStrength < 60 ? '#f87171' : '#1ed0b5', fontWeight: '700' }}>{sim.signalStrength.toFixed(0)}</span>
              <span style={{ color: '#555', fontSize: '11px' }}> % signal</span>
            </div>
          </Card>
          <Card label="Uptime">
            <Val v={uptime} color="#a78bfa" size="14px" />
          </Card>
        </div>
      </Section>

      {/* ── TASK / DELIVERY ── */}
      <Section title="Task / Delivery Data">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <Card label="Task ID">
            <span style={{ fontFamily: 'monospace', color: '#1ed0b5', fontWeight: '700', fontSize: '14px' }}>{sim.taskId}</span>
          </Card>
          <Card label="Task Status">
            <Pill
              label={sim.taskStatus.toUpperCase()}
              color={sim.taskStatus === 'active' ? '#60a5fa' : sim.taskStatus === 'completed' ? '#4ade80' : '#fbbf24'}
            />
          </Card>
          <Card label="Pickup Location">
            <div style={{ fontSize: '12px', color: '#fbbf24', fontWeight: '600' }}>{PICKUP_LOC.label}</div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', fontFamily: 'monospace' }}>{PICKUP_LOC.lat}, {PICKUP_LOC.lng}</div>
          </Card>
          <Card label="Drop Location">
            <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: '600' }}>{DROPOFF_LOC.label}</div>
            <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', fontFamily: 'monospace' }}>{DROPOFF_LOC.lat}, {DROPOFF_LOC.lng}</div>
          </Card>
          <Card label="Load Weight">
            <Val v={sim.loadWeight.toFixed(1)} unit="kg" color={sim.cargo ? '#fbbf24' : '#555'} />
          </Card>
          <Card label="ETA / Delivery">
            {sim.etaSec > 0
              ? <><Val v={`${sim.etaSec}s`} color="#60a5fa" size="16px" /><div style={{ fontSize: '10px', color: '#555', marginTop: '3px' }}>estimated</div></>
              : <div style={{ fontSize: '12px', color: '#555' }}>{sim.deliveryTimeActual ? `Done at ${sim.deliveryTimeActual}` : '--'}</div>}
          </Card>
        </div>
      </Section>

      {/* ── CHARTS ── */}
      <Section title="Live Charts">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
          <Card label="Speed Fluctuations (m/s)">
            <Sparkline data={speedHist} color="#60a5fa" maxVal={2} />
          </Card>
          <Card label="Battery Drain Curve (%)">
            <Sparkline data={battHist} color={batColor} maxVal={100} />
          </Card>
          <Card label="Sensor Spikes — Lidar Min (cm)">
            <Sparkline data={lidarHist} color="#1ed0b5" maxVal={400} />
          </Card>
        </div>
      </Section>

      {/* ── SMART MAP ── */}
      <Section title="Smart Map">
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <span style={{ color: '#1ed0b5' }}>— Planned path</span>
          <span style={{ color: '#60a5fa' }}>— Actual path</span>
          <span style={{ color: '#f87171' }}>● Obstacle zones</span>
          <span style={{ color: '#fbbf24' }}>■ Heatmap / Congestion</span>
        </div>
        <SmartMap actualPath={actualPath} robotX={robotPos.x} robotY={robotPos.y} />
      </Section>

      {/* ── CAMERA MODULE ── */}
      <Section title="Camera Feed & Analysis">
        <CameraModule />
      </Section>

    </div>
  );
}
