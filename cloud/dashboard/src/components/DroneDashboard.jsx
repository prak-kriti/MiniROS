import { useState, useEffect, useRef } from 'react';
import CameraModule from './CameraModule';
import AIInsights from './AIInsights';

// ── Drone AI Engine ───────────────────────────────────────────────────────────
const AI_HISTORY = 30;

function meanArr(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function stdArr(a) {
  const m = meanArr(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
}
function slopeArr(a) {
  const n = a.length, mx = (n - 1) / 2;
  const my = meanArr(a);
  const num = a.reduce((s, v, i) => s + (i - mx) * (v - my), 0);
  const den = a.reduce((s, _, i) => s + (i - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function analyzeDrone(sim, hist, prevBattery) {
  // Push metrics into rolling history
  const fields = ['altitude', 'battery', 'groundSpeed', 'linkQuality', 'rssi',
                  'cpuTemp', 'battTemp', 'windSpeed', 'hdop', 'cpuUsage'];
  fields.forEach(f => {
    if (sim[f] !== undefined) {
      hist[f] = [...(hist[f] || []), sim[f]].slice(-AI_HISTORY);
    }
  });

  const anomalies = [];
  const trend = {};
  let healthScore = 100;

  // Anomaly detection (Z-score > 2.5)
  fields.forEach(f => {
    const vals = hist[f] || [];
    if (vals.length < 5) return;
    const m = meanArr(vals), s = stdArr(vals);
    if (s > 0) {
      const z = Math.abs((vals[vals.length - 1] - m) / s);
      if (z > 2.5) {
        anomalies.push({ field: f, value: +vals[vals.length - 1].toFixed(2), z_score: +z.toFixed(2), message: `${f} is ${z.toFixed(1)}σ from recent average (avg: ${m.toFixed(1)})` });
        healthScore -= 10;
      }
    }
    if (vals.length >= 10) {
      const sl = slopeArr(vals);
      trend[f] = { direction: sl > 0.05 ? 'rising' : sl < -0.05 ? 'falling' : 'stable', slope: +sl.toFixed(4) };
    }
  });

  // ── Analytics / Derived Data ─────────────────────────────────────────────
  const batteryDrainRate = (hist.battery?.length >= 10)
    ? +Math.abs(slopeArr(hist.battery)).toFixed(3) : null;

  const efficiency = (sim.distanceCovered > 0 && (100 - sim.battery) > 0)
    ? +(sim.distanceCovered / (100 - sim.battery)).toFixed(1) : null;

  const predictedFlightTime = (batteryDrainRate && batteryDrainRate > 0)
    ? +(sim.battery / batteryDrainRate / 2).toFixed(0) : sim.flightTimeRem;

  const pathDeviation = sim.distanceCovered > 0
    ? +(Math.sqrt(Math.pow((sim.gpsLat - sim.homeLat) * 111000, 2) + Math.pow((sim.gpsLng - sim.homeLng) * 111000, 2))).toFixed(1) : 0;

  // ── Insight Generation ───────────────────────────────────────────────────
  const insights = [];

  // Alerts & Safety
  if (sim.failsafe)
    insights.push({ level: 'critical', msg: 'FAIL-SAFE TRIGGERED — multiple critical conditions active' });
  if (sim.emergency)
    insights.push({ level: 'critical', msg: 'Emergency status active — immediate action required' });
  if (!sim.geofenceOk)
    insights.push({ level: 'critical', msg: 'Geofence breach — return to boundary immediately' });
  if (sim.obstacleAlert)
    insights.push({ level: 'critical', msg: 'Obstacle detected — collision avoidance engaged' });

  // Battery
  if (sim.battery < 10)
    insights.push({ level: 'critical', msg: `Battery critically low: ${sim.battery}% — initiate RTL now` });
  else if (sim.battery < 20)
    insights.push({ level: 'critical', msg: `Low battery: ${sim.battery}% — return to home recommended` });
  else if (sim.battery < 35)
    insights.push({ level: 'warning', msg: `Battery below 35%: ${sim.battery}% — monitor closely` });

  // Signal
  if (sim.signalLoss)
    insights.push({ level: 'critical', msg: 'Signal loss detected — failsafe may trigger' });
  else if (sim.linkQuality < 70)
    insights.push({ level: 'warning', msg: `Weak link: ${sim.linkQuality.toFixed(0)}% (RSSI ${sim.rssi} dBm)` });

  // GPS
  if (sim.satellites < 6)
    insights.push({ level: 'critical', msg: `Only ${sim.satellites} satellites — GPS unreliable` });
  else if (sim.hdop > 2.5)
    insights.push({ level: 'warning', msg: `Poor GPS accuracy: HDOP ${sim.hdop}` });

  // Wind
  if (sim.windSpeed > 10)
    insights.push({ level: 'critical', msg: `Wind at ${sim.windSpeed} m/s — stability at risk` });
  else if (sim.windSpeed > 7)
    insights.push({ level: 'warning', msg: `Elevated wind: ${sim.windSpeed} m/s — efficiency reduced` });

  // Temps
  if (sim.cpuTemp > 75)
    insights.push({ level: 'critical', msg: `CPU overheating: ${sim.cpuTemp}°C` });
  else if (sim.cpuTemp > 65)
    insights.push({ level: 'warning', msg: `High CPU temp: ${sim.cpuTemp}°C` });
  if (sim.battTemp > 50)
    insights.push({ level: 'critical', msg: `Battery overheating: ${sim.battTemp}°C — land immediately` });
  else if (sim.battTemp > 42)
    insights.push({ level: 'warning', msg: `Elevated battery temp: ${sim.battTemp}°C` });

  // Analytics / Derived Data
  if (batteryDrainRate !== null)
    insights.push({ level: 'info', msg: `Battery drain rate: ${batteryDrainRate}%/s` });
  if (efficiency !== null)
    insights.push({ level: 'info', msg: `Flight efficiency: ${efficiency} m per 1% battery` });
  if (predictedFlightTime !== null)
    insights.push({ level: predictedFlightTime < 5 ? 'warning' : 'info', msg: `Predicted flight time remaining: ~${predictedFlightTime} min` });
  if (pathDeviation > 0)
    insights.push({ level: pathDeviation > 500 ? 'warning' : 'info', msg: `Path deviation from home: ${pathDeviation} m` });

  // Trend insights
  if (trend.battery?.direction === 'falling')
    insights.push({ level: 'info', msg: `Battery trending down (slope: ${trend.battery.slope}/tick)` });
  if (trend.linkQuality?.direction === 'falling')
    insights.push({ level: 'warning', msg: 'Signal quality degrading over time' });
  if (trend.cpuTemp?.direction === 'rising')
    insights.push({ level: 'info', msg: 'CPU temperature trending upward' });
  if (trend.windSpeed?.direction === 'rising')
    insights.push({ level: 'info', msg: 'Wind speed increasing — monitor conditions' });

  // Nodes
  if (!sim.nodeStatus?.gps)
    insights.push({ level: 'critical', msg: 'GPS node offline — autonomous flight disabled' });
  if (!sim.nodeStatus?.imu)
    insights.push({ level: 'critical', msg: 'IMU node offline — attitude control degraded' });

  if (insights.length === 0)
    insights.push({ level: 'ok', msg: 'All drone systems nominal — no issues detected' });

  return {
    insights, anomalies, trend,
    health_score: Math.max(0, healthScore),
    derived: { batteryDrainRate, efficiency, predictedFlightTime, pathDeviation },
  };
}

const FLIGHT_MODES = ['MANUAL', 'STABILIZE', 'ALT_HOLD', 'AUTO', 'LOITER', 'RTL', 'LAND'];
const MISSION_STATES = ['idle', 'running', 'paused', 'completed'];

function StatCard({ label, value, unit, color = '#cde0df', sub, warn }) {
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: `1px solid ${warn ? '#ff7d7244' : '#2a2d3a'}` }}>
      <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '19px', fontWeight: '700', color: warn ? '#ff7d72' : color }}>
        {value}<span style={{ fontSize: '12px', color: '#555', marginLeft: '3px' }}>{unit}</span>
      </div>
      {sub && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{sub}</div>}
    </div>
  );
}

function SectionTitle({ title }) {
  return (
    <div style={{ fontSize: '10px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px', marginTop: '20px', borderBottom: '1px solid #2a2d3a', paddingBottom: '6px' }}>
      {title}
    </div>
  );
}

function BarStat({ label, value, max = 100, color }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
        <span style={{ color: '#888' }}>{label}</span>
        <span style={{ color, fontWeight: '600' }}>{value.toFixed(1)}{max === 100 ? '%' : ''}</span>
      </div>
      <div style={{ height: '4px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s', borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function AlertBadge({ label, active, level = 'warn' }) {
  const colors = { warn: '#ffb44d', danger: '#ff7d72', ok: '#79e49d' };
  const c = active ? colors[level] : '#2a2d3a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: active ? `${c}18` : '#1e2130', borderRadius: '8px', border: `1px solid ${active ? c + '66' : '#2a2d3a'}` }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, boxShadow: active ? `0 0 6px ${c}` : 'none', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: active ? c : '#444', fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
  );
}

export default function DroneDashboard({ deviceName }) {
  const [tab, setTab] = useState('overview');
  const tickRef = useRef(0);
  const battRef = useRef(92);
  const histRef = useRef({});
  const [droneAI, setDroneAI] = useState(null);

  const [sim, setSim] = useState({
    // Flight state
    flightState: 'idle',
    flightMode: 'STABILIZE',
    // Altitude & speed
    altitude: 0, altitudeRel: 0,
    velocityX: 0, velocityY: 0, velocityZ: 0,
    groundSpeed: 0, airSpeed: 0,
    accelX: 0, accelY: 0, accelZ: 9.8,
    // Orientation
    roll: 0, pitch: 0, yaw: 0, heading: 0,
    // GPS
    gpsLat: 28.6139, gpsLng: 77.2090,
    hdop: 1.2, satellites: 12,
    distToWaypoint: 250, distanceCovered: 0,
    homeLat: 28.6139, homeLng: 77.2090,
    // Battery
    battery: 92, voltage: 16.8, current: 8.2,
    power: 0, flightTimeRem: 22,
    // Communication
    rssi: -65, linkQuality: 98, latency: 42,
    packetLoss: 0.2, uplinkBw: 1.2, downlinkBw: 0.8,
    // System
    cpuUsage: 22, memUsage: 38, cpuTemp: 48, battTemp: 32,
    nodeStatus: { mavlink: true, telemetry: true, gps: true, imu: true },
    errorLogs: [],
    // Camera
    streamActive: false, camFps: 30, camRes: '1080p', gimbalPitch: 0, gimbalRoll: 0,
    // Environment
    windSpeed: 2.4, windDir: 135, pressure: 1013.2, ambientTemp: 28.5, humidity: 62,
    // Mission
    missionStatus: 'idle', eta: 0, waypointIdx: 0, totalWaypoints: 8, geofenceOk: true,
    // Alerts
    lowBattery: false, obstacleAlert: false, signalLoss: false, emergency: false, failsafe: false,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;

      setSim((prev) => {
        const s = { ...prev };
        const cycle = t % 200;

        // Battery drain
        battRef.current = Math.max(0, battRef.current - 0.02);
        s.battery = Math.round(battRef.current);
        s.voltage = +(16.8 - (92 - battRef.current) * 0.05).toFixed(2);
        s.current = +(8 + Math.random() * 2).toFixed(1);
        s.power = +(s.voltage * s.current).toFixed(1);
        s.flightTimeRem = Math.max(0, Math.round((battRef.current / 100) * 22));
        s.battTemp = +(32 + (92 - battRef.current) * 0.1 + Math.random() * 0.5).toFixed(1);

        // Flight phases
        if (cycle < 30) {
          s.flightState = 'ascending';
          s.flightMode = 'ALT_HOLD';
          s.altitude = Math.min(120, s.altitude + 2);
          s.velocityZ = 2;
          s.velocityX = 0; s.velocityY = 0;
          s.groundSpeed = 0; s.airSpeed = 0;
          s.missionStatus = 'running';
        } else if (cycle < 120) {
          s.flightState = 'cruising';
          s.flightMode = 'AUTO';
          s.altitude += (Math.random() * 1 - 0.5);
          s.velocityX = +(3 + Math.random() * 2).toFixed(2);
          s.velocityY = +(Math.random() * 1 - 0.5).toFixed(2);
          s.velocityZ = +(Math.random() * 0.4 - 0.2).toFixed(2);
          s.groundSpeed = +(8 + Math.random() * 4).toFixed(1);
          s.airSpeed = +(s.groundSpeed + Math.random() * 1).toFixed(1);
          s.heading = (s.heading + 2) % 360;
          s.distanceCovered += s.groundSpeed * 0.05;
          s.distToWaypoint = Math.max(0, s.distToWaypoint - 0.5);
          s.gpsLat += 0.00003; s.gpsLng += 0.00002;
          s.eta = Math.max(0, Math.round(s.distToWaypoint / s.groundSpeed));
        } else if (cycle < 140) {
          s.flightState = 'hovering';
          s.flightMode = 'LOITER';
          s.velocityX = +(Math.random() * 0.2 - 0.1).toFixed(2);
          s.velocityY = +(Math.random() * 0.2 - 0.1).toFixed(2);
          s.velocityZ = +(Math.random() * 0.1 - 0.05).toFixed(2);
          s.groundSpeed = +(Math.random() * 0.5).toFixed(1);
          s.airSpeed = s.groundSpeed;
          s.missionStatus = 'paused';
        } else if (cycle < 180) {
          s.flightState = 'descending';
          s.flightMode = 'RTL';
          s.altitude = Math.max(0, s.altitude - 1.5);
          s.velocityZ = -1.5;
          s.velocityX = 0; s.velocityY = 0;
          s.groundSpeed = 0; s.airSpeed = 0;
          s.missionStatus = 'completed';
        } else {
          s.flightState = 'landing';
          s.flightMode = 'LAND';
          s.altitude = 0; s.groundSpeed = 0; s.airSpeed = 0;
        }

        // Orientation
        s.roll = +(Math.sin(t * 0.05) * 8 + Math.random() * 1).toFixed(1);
        s.pitch = +(Math.cos(t * 0.04) * 5 + Math.random() * 0.5).toFixed(1);
        s.yaw = s.heading;
        s.accelX = +(Math.random() * 0.4 - 0.2).toFixed(2);
        s.accelY = +(Math.random() * 0.4 - 0.2).toFixed(2);
        s.accelZ = +(9.8 + Math.random() * 0.1).toFixed(2);

        s.altitude = Math.max(0, +s.altitude.toFixed(1));
        s.altitudeRel = s.altitude;

        // GPS
        s.hdop = +(1.0 + Math.random() * 0.5).toFixed(2);
        s.satellites = Math.max(8, Math.min(16, s.satellites + (Math.random() > 0.9 ? (Math.random() > 0.5 ? 1 : -1) : 0)));

        // Comms
        s.rssi = Math.round(-65 + Math.random() * 10 - 5);
        s.linkQuality = Math.min(100, Math.max(60, s.linkQuality + (Math.random() * 4 - 2)));
        s.latency = Math.round(40 + Math.random() * 20);
        s.packetLoss = +(Math.random() * 1).toFixed(2);
        s.uplinkBw = +(1.0 + Math.random() * 0.5).toFixed(2);
        s.downlinkBw = +(0.6 + Math.random() * 0.4).toFixed(2);

        // System
        s.cpuUsage = +(20 + Math.random() * 20).toFixed(1);
        s.memUsage = +(35 + Math.random() * 10).toFixed(1);
        s.cpuTemp = +(46 + Math.random() * 6).toFixed(1);
        s.nodeStatus = { mavlink: true, telemetry: true, gps: s.satellites > 6, imu: true };

        // Environment
        s.windSpeed = +(2 + Math.random() * 3).toFixed(1);
        s.windDir = Math.round(s.windDir + Math.random() * 4 - 2) % 360;
        s.pressure = +(1013 - s.altitude * 0.012 + Math.random() * 0.2).toFixed(1);
        s.ambientTemp = +(28.5 - s.altitude * 0.006 + Math.random() * 0.3).toFixed(1);
        s.humidity = +(62 + Math.random() * 2 - 1).toFixed(1);

        // Gimbal
        s.gimbalPitch = +(Math.sin(t * 0.03) * 15).toFixed(1);

        // Alerts
        s.lowBattery = s.battery < 20;
        s.signalLoss = s.linkQuality < 70;
        s.obstacleAlert = Math.random() < 0.01;
        s.emergency = false;
        s.failsafe = s.lowBattery && s.signalLoss;
        s.geofenceOk = true;

        // Run AI every 2 ticks (1s)
        if (tickRef.current % 2 === 0) {
          setDroneAI(analyzeDrone(s, histRef.current));
        }

        return s;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const stateColor = {
    idle: '#7fa1a6', ascending: '#79e49d', cruising: '#72c7ff',
    hovering: '#ffb44d', descending: '#ffb44d', landing: '#ff7d72',
  };

  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const headingDir = dirs[Math.round(sim.heading / 45) % 8];
  const windDirLabel = dirs[Math.round(sim.windDir / 45) % 8];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'flight', label: 'Flight' },
    { id: 'gps', label: 'GPS' },
    { id: 'battery', label: 'Battery' },
    { id: 'comms', label: 'Comms' },
    { id: 'system', label: 'System' },
    { id: 'environment', label: 'Environment' },
    { id: 'mission', label: 'Mission' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'ai', label: 'AI Insights' },
    { id: 'camera', label: 'Camera' },
  ];

  const activeAlerts = [sim.lowBattery, sim.obstacleAlert, sim.signalLoss, sim.emergency, sim.failsafe].filter(Boolean).length;

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)', color: '#cde0df' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Drone Dashboard</span>
          <h3 style={{ margin: '4px 0 0', color: '#cde0df' }}>{deviceName || 'Drone'}</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Flight state badge */}
          <div style={{ background: '#1e2130', borderRadius: '8px', padding: '6px 14px', border: `1.5px solid ${stateColor[sim.flightState]}44`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: stateColor[sim.flightState], boxShadow: `0 0 6px ${stateColor[sim.flightState]}` }} />
            <span style={{ color: stateColor[sim.flightState], fontWeight: '600', textTransform: 'capitalize', fontSize: '13px' }}>{sim.flightState}</span>
          </div>
          {/* Flight mode badge */}
          <div style={{ background: '#1e2130', borderRadius: '8px', padding: '6px 14px', border: '1px solid #2a2d3a', fontSize: '12px', color: '#72c7ff', fontWeight: '700' }}>
            {sim.flightMode}
          </div>
          {/* Alert indicator */}
          {activeAlerts > 0 && (
            <div style={{ background: '#ff7d7222', borderRadius: '8px', padding: '6px 14px', border: '1px solid #ff7d7266', fontSize: '12px', color: '#ff7d72', fontWeight: '700' }}>
              ⚠ {activeAlerts} Alert{activeAlerts > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.id ? '#1ed0b5' : '#1e2130',
              color: tab === t.id ? '#000' : '#7fa1a6',
              borderColor: tab === t.id ? '#1ed0b5' : '#2a2d3a',
            }}>
            {t.label}{t.id === 'alerts' && activeAlerts > 0 ? ` (${activeAlerts})` : ''}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Altitude" value={sim.altitude} unit="m" color="#72c7ff" />
            <StatCard label="Ground Speed" value={sim.groundSpeed} unit="m/s" color="#79e49d" />
            <StatCard label="Heading" value={`${sim.heading.toFixed(0)}°`} unit={headingDir} color="#ffb44d" />
            <StatCard label="Battery" value={`${sim.battery}%`} color={sim.battery < 20 ? '#ff7d72' : '#79e49d'} warn={sim.battery < 20} sub={`${sim.voltage}V · ${sim.flightTimeRem}min left`} />
            <StatCard label="Signal" value={`${sim.linkQuality.toFixed(0)}%`} color={sim.linkQuality < 70 ? '#ff7d72' : '#1ed0b5'} warn={sim.linkQuality < 70} sub={`RSSI ${sim.rssi} dBm`} />
            <StatCard label="GPS Sats" value={sim.satellites} color="#a78bfa" sub={`HDOP ${sim.hdop}`} />
            <StatCard label="Roll" value={sim.roll} unit="°" color="#e879f9" />
            <StatCard label="Pitch" value={sim.pitch} unit="°" color="#e879f9" />
            <StatCard label="Distance" value={sim.distanceCovered.toFixed(0)} unit="m" color="#60a5fa" />
          </div>
          <SectionTitle title="GPS Position" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#555', fontSize: '12px' }}>LAT </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLat.toFixed(6)}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>LNG </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLng.toFixed(6)}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>HOME </span><span style={{ color: '#7fa1a6', fontWeight: '600' }}>{sim.homeLat.toFixed(5)}, {sim.homeLng.toFixed(5)}</span></div>
          </div>
        </div>
      )}

      {/* ── FLIGHT DATA ── */}
      {tab === 'flight' && (
        <div>
          <SectionTitle title="Altitude & Speed" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Altitude (Abs)" value={sim.altitude} unit="m" color="#72c7ff" />
            <StatCard label="Altitude (Rel)" value={sim.altitudeRel} unit="m" color="#60a5fa" />
            <StatCard label="Ground Speed" value={sim.groundSpeed} unit="m/s" color="#79e49d" />
            <StatCard label="Air Speed" value={sim.airSpeed} unit="m/s" color="#4ade80" />
          </div>

          <SectionTitle title="Velocity (X / Y / Z)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <StatCard label="Velocity X" value={sim.velocityX} unit="m/s" color="#f472b6" />
            <StatCard label="Velocity Y" value={sim.velocityY} unit="m/s" color="#f472b6" />
            <StatCard label="Velocity Z" value={sim.velocityZ} unit="m/s" color={sim.velocityZ < 0 ? '#ff7d72' : '#79e49d'} />
          </div>

          <SectionTitle title="Acceleration" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            <StatCard label="Accel X" value={sim.accelX} unit="m/s²" color="#fb923c" />
            <StatCard label="Accel Y" value={sim.accelY} unit="m/s²" color="#fb923c" />
            <StatCard label="Accel Z" value={sim.accelZ} unit="m/s²" color="#fb923c" />
          </div>

          <SectionTitle title="Orientation (IMU)" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Roll" value={sim.roll} unit="°" color="#e879f9" />
            <StatCard label="Pitch" value={sim.pitch} unit="°" color="#e879f9" />
            <StatCard label="Yaw" value={sim.yaw.toFixed(1)} unit="°" color="#e879f9" />
            <StatCard label="Heading" value={`${sim.heading.toFixed(0)}°`} unit={headingDir} color="#ffb44d" sub="Compass" />
          </div>
        </div>
      )}

      {/* ── GPS & NAVIGATION ── */}
      {tab === 'gps' && (
        <div>
          <SectionTitle title="Position" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <StatCard label="Latitude" value={sim.gpsLat.toFixed(6)} color="#79e49d" />
            <StatCard label="Longitude" value={sim.gpsLng.toFixed(6)} color="#79e49d" />
            <StatCard label="GPS Accuracy (HDOP)" value={sim.hdop} color={sim.hdop > 2 ? '#ff7d72' : '#79e49d'} warn={sim.hdop > 2} sub={sim.hdop < 1.5 ? 'Excellent' : sim.hdop < 2 ? 'Good' : 'Poor'} />
            <StatCard label="Satellites" value={sim.satellites} color="#a78bfa" sub={sim.satellites > 10 ? 'Strong fix' : 'Weak fix'} />
          </div>

          <SectionTitle title="Navigation" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px' }}>
            <StatCard label="Waypoint" value={`${sim.waypointIdx}/${sim.totalWaypoints}`} color="#72c7ff" sub="Current waypoint" />
            <StatCard label="Dist to Waypoint" value={sim.distToWaypoint.toFixed(0)} unit="m" color="#60a5fa" />
            <StatCard label="Distance Covered" value={sim.distanceCovered.toFixed(0)} unit="m" color="#4ade80" />
            <StatCard label="Geofence" value={sim.geofenceOk ? 'OK' : 'BREACH'} color={sim.geofenceOk ? '#79e49d' : '#ff7d72'} warn={!sim.geofenceOk} />
          </div>

          <SectionTitle title="Home Position (RTH)" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a', display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#555', fontSize: '12px' }}>HOME LAT </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.homeLat.toFixed(6)}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>HOME LNG </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.homeLng.toFixed(6)}</span></div>
          </div>
        </div>
      )}

      {/* ── BATTERY & POWER ── */}
      {tab === 'battery' && (
        <div>
          <SectionTitle title="Battery Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Battery %" value={`${sim.battery}%`} color={sim.battery < 20 ? '#ff7d72' : sim.battery < 40 ? '#ffb44d' : '#79e49d'} warn={sim.battery < 20} />
            <StatCard label="Voltage" value={sim.voltage} unit="V" color="#fbbf24" sub={`${(sim.voltage / 4).toFixed(2)}V per cell`} />
            <StatCard label="Current Draw" value={sim.current} unit="A" color="#fb923c" />
            <StatCard label="Power Consumption" value={sim.power} unit="W" color="#f87171" />
            <StatCard label="Est. Flight Time" value={sim.flightTimeRem} unit="min" color={sim.flightTimeRem < 5 ? '#ff7d72' : '#79e49d'} warn={sim.flightTimeRem < 5} sub="Remaining" />
            <StatCard label="Battery Temp" value={sim.battTemp} unit="°C" color={sim.battTemp > 45 ? '#ff7d72' : '#7fa1a6'} warn={sim.battTemp > 45} />
          </div>

          <SectionTitle title="Battery Level" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Charge Level" value={sim.battery} color={sim.battery < 20 ? '#ff7d72' : sim.battery < 40 ? '#ffb44d' : '#79e49d'} />
            <BarStat label="Current Load" value={sim.current} max={30} color="#fb923c" />
            <BarStat label="Battery Temp" value={sim.battTemp} max={60} color="#fbbf24" />
          </div>
        </div>
      )}

      {/* ── COMMUNICATION ── */}
      {tab === 'comms' && (
        <div>
          <SectionTitle title="Link Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="RSSI" value={`${sim.rssi}`} unit="dBm" color={sim.rssi < -80 ? '#ff7d72' : sim.rssi < -70 ? '#ffb44d' : '#79e49d'} warn={sim.rssi < -80} sub={sim.rssi > -70 ? 'Strong' : sim.rssi > -80 ? 'Fair' : 'Weak'} />
            <StatCard label="Link Quality" value={`${sim.linkQuality.toFixed(0)}%`} color={sim.linkQuality < 70 ? '#ff7d72' : '#1ed0b5'} warn={sim.linkQuality < 70} />
            <StatCard label="Latency" value={sim.latency} unit="ms" color={sim.latency > 100 ? '#ff7d72' : '#72c7ff'} />
            <StatCard label="Packet Loss" value={`${sim.packetLoss}%`} color={sim.packetLoss > 2 ? '#ff7d72' : '#79e49d'} warn={sim.packetLoss > 2} />
          </div>

          <SectionTitle title="Bandwidth" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
            <StatCard label="Uplink BW" value={sim.uplinkBw} unit="Mbps" color="#60a5fa" sub="Ground → Drone" />
            <StatCard label="Downlink BW" value={sim.downlinkBw} unit="Mbps" color="#a78bfa" sub="Drone → Ground" />
          </div>

          <SectionTitle title="Signal Strength" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Link Quality" value={sim.linkQuality} color={sim.linkQuality < 70 ? '#ff7d72' : '#1ed0b5'} />
            <BarStat label="Uplink BW" value={sim.uplinkBw} max={5} color="#60a5fa" />
            <BarStat label="Downlink BW" value={sim.downlinkBw} max={5} color="#a78bfa" />
          </div>
        </div>
      )}

      {/* ── SYSTEM HEALTH ── */}
      {tab === 'system' && (
        <div>
          <SectionTitle title="Compute Resources" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="CPU Usage" value={`${sim.cpuUsage.toFixed(0)}%`} color={sim.cpuUsage > 80 ? '#ff7d72' : '#79e49d'} warn={sim.cpuUsage > 80} />
            <StatCard label="Memory Usage" value={`${sim.memUsage.toFixed(0)}%`} color={sim.memUsage > 80 ? '#ff7d72' : '#72c7ff'} warn={sim.memUsage > 80} />
            <StatCard label="CPU Temp" value={sim.cpuTemp} unit="°C" color={sim.cpuTemp > 70 ? '#ff7d72' : '#ffb44d'} warn={sim.cpuTemp > 70} />
            <StatCard label="Battery Temp" value={sim.battTemp} unit="°C" color={sim.battTemp > 45 ? '#ff7d72' : '#7fa1a6'} warn={sim.battTemp > 45} />
          </div>

          <SectionTitle title="Resource Usage" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="CPU" value={sim.cpuUsage} color={sim.cpuUsage > 80 ? '#ff7d72' : '#79e49d'} />
            <BarStat label="Memory" value={sim.memUsage} color={sim.memUsage > 80 ? '#ff7d72' : '#72c7ff'} />
            <BarStat label="CPU Temp" value={sim.cpuTemp} max={100} color="#ffb44d" />
          </div>

          <SectionTitle title="Node / Service Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            {Object.entries(sim.nodeStatus).map(([node, alive]) => (
              <div key={node} style={{ background: '#1e2130', borderRadius: '10px', padding: '12px 16px', border: `1px solid ${alive ? '#79e49d33' : '#ff7d7233'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alive ? '#79e49d' : '#ff7d72', boxShadow: `0 0 5px ${alive ? '#79e49d' : '#ff7d72'}` }} />
                <span style={{ fontSize: '12px', color: alive ? '#cde0df' : '#ff7d72', fontWeight: '600', textTransform: 'uppercase' }}>{node}</span>
              </div>
            ))}
          </div>

          <SectionTitle title="Error Logs" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a', minHeight: '60px' }}>
            {sim.errorLogs.length === 0
              ? <span style={{ fontSize: '12px', color: '#444' }}>No errors logged.</span>
              : sim.errorLogs.map((e, i) => <div key={i} style={{ fontSize: '12px', color: '#ff7d72', fontFamily: 'monospace' }}>{e}</div>)
            }
          </div>
        </div>
      )}

      {/* ── ENVIRONMENT ── */}
      {tab === 'environment' && (
        <div>
          <SectionTitle title="Weather Conditions" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Wind Speed" value={sim.windSpeed} unit="m/s" color={sim.windSpeed > 8 ? '#ff7d72' : '#79e49d'} warn={sim.windSpeed > 8} sub={`Dir: ${windDirLabel} (${sim.windDir}°)`} />
            <StatCard label="Wind Direction" value={`${sim.windDir}°`} unit={windDirLabel} color="#72c7ff" />
            <StatCard label="Air Pressure" value={sim.pressure} unit="hPa" color="#a78bfa" />
            <StatCard label="Ambient Temp" value={sim.ambientTemp} unit="°C" color="#fb923c" sub={`At ${sim.altitude.toFixed(0)}m altitude`} />
            <StatCard label="Humidity" value={`${sim.humidity.toFixed(0)}%`} color="#60a5fa" />
          </div>

          <SectionTitle title="Environmental Trend" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Wind Speed" value={sim.windSpeed} max={15} color={sim.windSpeed > 8 ? '#ff7d72' : '#79e49d'} />
            <BarStat label="Humidity" value={sim.humidity} color="#60a5fa" />
            <BarStat label="Ambient Temp" value={sim.ambientTemp} max={50} color="#fb923c" />
          </div>
        </div>
      )}

      {/* ── MISSION ── */}
      {tab === 'mission' && (
        <div>
          <SectionTitle title="Mission Control" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Flight Mode" value={sim.flightMode} color="#72c7ff" />
            <StatCard label="Mission Status" value={sim.missionStatus} color={sim.missionStatus === 'running' ? '#79e49d' : sim.missionStatus === 'paused' ? '#ffb44d' : '#7fa1a6'} />
            <StatCard label="ETA to Waypoint" value={`${sim.eta}s`} color="#60a5fa" />
            <StatCard label="Distance Covered" value={sim.distanceCovered.toFixed(0)} unit="m" color="#4ade80" />
          </div>

          <SectionTitle title="Waypoint Progress" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              <span>Waypoint {sim.waypointIdx} of {sim.totalWaypoints}</span>
              <span style={{ color: '#72c7ff' }}>{((sim.waypointIdx / sim.totalWaypoints) * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: '6px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${(sim.waypointIdx / sim.totalWaypoints) * 100}%`, height: '100%', background: '#72c7ff', borderRadius: '4px', transition: 'width 0.4s' }} />
            </div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '14px', flexWrap: 'wrap' }}>
              {Array.from({ length: sim.totalWaypoints }, (_, i) => (
                <div key={i} style={{ width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: '700',
                  background: i < sim.waypointIdx ? '#79e49d22' : i === sim.waypointIdx ? '#72c7ff33' : '#1a1d28',
                  border: `2px solid ${i < sim.waypointIdx ? '#79e49d' : i === sim.waypointIdx ? '#72c7ff' : '#2a2d3a'}`,
                  color: i < sim.waypointIdx ? '#79e49d' : i === sim.waypointIdx ? '#72c7ff' : '#444',
                }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>

          <SectionTitle title="Geofence" />
          <div style={{ background: sim.geofenceOk ? '#79e49d11' : '#ff7d7211', borderRadius: '10px', padding: '14px 18px', border: `1px solid ${sim.geofenceOk ? '#79e49d33' : '#ff7d7233'}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: sim.geofenceOk ? '#79e49d' : '#ff7d72', boxShadow: `0 0 8px ${sim.geofenceOk ? '#79e49d' : '#ff7d72'}` }} />
            <span style={{ color: sim.geofenceOk ? '#79e49d' : '#ff7d72', fontWeight: '600' }}>
              {sim.geofenceOk ? 'Within geofence boundaries' : 'GEOFENCE BREACH DETECTED'}
            </span>
          </div>
        </div>
      )}

      {/* ── ALERTS ── */}
      {tab === 'alerts' && (
        <div>
          <SectionTitle title="Active Alerts" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <AlertBadge label="Low Battery Warning" active={sim.lowBattery} level="danger" />
            <AlertBadge label="Obstacle Detected" active={sim.obstacleAlert} level="danger" />
            <AlertBadge label="Signal Loss" active={sim.signalLoss} level="warn" />
            <AlertBadge label="Emergency Status" active={sim.emergency} level="danger" />
            <AlertBadge label="Fail-Safe Triggered" active={sim.failsafe} level="danger" />
            <AlertBadge label="Geofence Breach" active={!sim.geofenceOk} level="warn" />
          </div>

          <SectionTitle title="System Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <AlertBadge label="GPS Lock OK" active={sim.satellites > 6} level="ok" />
            <AlertBadge label="IMU Healthy" active={sim.nodeStatus.imu} level="ok" />
            <AlertBadge label="MAVLink Connected" active={sim.nodeStatus.mavlink} level="ok" />
            <AlertBadge label="Telemetry Active" active={sim.nodeStatus.telemetry} level="ok" />
          </div>

          {activeAlerts === 0 && (
            <div style={{ background: '#79e49d11', border: '1px solid #79e49d33', borderRadius: '10px', padding: '20px', textAlign: 'center', marginTop: '16px' }}>
              <div style={{ color: '#79e49d', fontWeight: '700', fontSize: '15px' }}>All systems nominal</div>
              <div style={{ color: '#555', fontSize: '12px', marginTop: '4px' }}>No active alerts detected</div>
            </div>
          )}
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {tab === 'ai' && (
        <div>
          {/* Derived Analytics Cards */}
          <SectionTitle title="Analytics / Derived Data" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '4px' }}>
            <StatCard
              label="Battery Drain Rate"
              value={droneAI?.derived?.batteryDrainRate ?? '—'}
              unit="%/s"
              color="#fbbf24"
              sub="Rolling 30-tick avg"
            />
            <StatCard
              label="Flight Efficiency"
              value={droneAI?.derived?.efficiency ?? '—'}
              unit="m/%"
              color="#79e49d"
              sub="Distance per 1% battery"
            />
            <StatCard
              label="Predicted Flight Time"
              value={droneAI?.derived?.predictedFlightTime ?? sim.flightTimeRem}
              unit="min"
              color={droneAI?.derived?.predictedFlightTime < 5 ? '#ff7d72' : '#72c7ff'}
              warn={droneAI?.derived?.predictedFlightTime < 5}
              sub="Based on drain rate"
            />
            <StatCard
              label="Path Deviation"
              value={droneAI?.derived?.pathDeviation ?? '—'}
              unit="m"
              color={droneAI?.derived?.pathDeviation > 500 ? '#ffb44d' : '#a78bfa'}
              sub="Distance from home"
            />
          </div>

          {/* Health Score */}
          <SectionTitle title="System Health Score" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Overall Health</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: droneAI?.health_score > 70 ? '#79e49d' : droneAI?.health_score > 40 ? '#ffb44d' : '#ff7d72' }}>
                {droneAI?.health_score ?? 100}/100
              </span>
            </div>
            <div style={{ height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                width: `${droneAI?.health_score ?? 100}%`, height: '100%', borderRadius: '4px', transition: 'width 0.5s',
                background: droneAI?.health_score > 70 ? '#79e49d' : droneAI?.health_score > 40 ? '#ffb44d' : '#ff7d72',
              }} />
            </div>
          </div>

          {/* AIInsights component — reuses existing panel style */}
          {droneAI && <AIInsights latest={{ ai: droneAI }} />}
        </div>
      )}

      {/* ── CAMERA ── */}
      {tab === 'camera' && (
        <div>
          <SectionTitle title="Camera & Gimbal" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <StatCard label="Gimbal Pitch" value={sim.gimbalPitch} unit="°" color="#a78bfa" />
            <StatCard label="Gimbal Roll" value={sim.gimbalRoll} unit="°" color="#a78bfa" />
            <StatCard label="Resolution" value={sim.camRes} color="#72c7ff" />
            <StatCard label="Target FPS" value={sim.camFps} unit="fps" color="#79e49d" />
          </div>
          <CameraModule />
        </div>
      )}

    </div>
  );
}
