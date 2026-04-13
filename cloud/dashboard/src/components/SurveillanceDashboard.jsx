import { useState, useEffect, useRef } from 'react';
import CameraModule from './CameraModule';
import AIInsights from './AIInsights';

// ── Zones & Constants ─────────────────────────────────────────────────────────
const ZONES = ['Sector A', 'Sector B', 'Gate 1', 'Gate 2', 'Perimeter N', 'Perimeter S'];
const OBJECT_LABELS = ['person', 'bag', 'vehicle', 'animal', 'package'];

// ── Surveillance AI Engine ────────────────────────────────────────────────────
const AI_HIST = 30;

function meanA(a) { return a.reduce((s, v) => s + v, 0) / a.length; }
function stdA(a) {
  const m = meanA(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);
}
function slopeA(a) {
  const n = a.length, mx = (n - 1) / 2, my = meanA(a);
  const num = a.reduce((s, v, i) => s + (i - mx) * (v - my), 0);
  const den = a.reduce((s, _, i) => s + (i - mx) ** 2, 0);
  return den === 0 ? 0 : num / den;
}

function analyzeSurveillance(sim, hist) {
  const fields = ['battery', 'cpuUsage', 'memUsage', 'cpuTemp', 'motorTemp',
                  'signalStrength', 'latency', 'ambientTemp', 'humidity',
                  'alertCount', 'detectionRate'];
  fields.forEach(f => {
    if (sim[f] !== undefined) {
      hist[f] = [...(hist[f] || []), sim[f]].slice(-AI_HIST);
    }
  });

  const anomalies = [];
  const trend = {};
  let healthScore = 100;

  fields.forEach(f => {
    const vals = hist[f] || [];
    if (vals.length < 5) return;
    const m = meanA(vals), s = stdA(vals);
    if (s > 0) {
      const z = Math.abs((vals[vals.length - 1] - m) / s);
      if (z > 2.5) {
        anomalies.push({ field: f, value: +vals[vals.length - 1].toFixed(2), z_score: +z.toFixed(2), message: `${f} is ${z.toFixed(1)}σ from recent average (avg: ${m.toFixed(1)})` });
        healthScore -= 10;
      }
    }
    if (vals.length >= 10) {
      const sl = slopeA(vals);
      trend[f] = { direction: sl > 0.05 ? 'rising' : sl < -0.05 ? 'falling' : 'stable', slope: +sl.toFixed(4) };
    }
  });

  // Derived analytics
  const battDrainRate = (hist.battery?.length >= 10) ? +Math.abs(slopeA(hist.battery)).toFixed(3) : null;
  const estimatedRuntime = battDrainRate && battDrainRate > 0 ? +(sim.battery / battDrainRate / 2).toFixed(0) : sim.runtimeRem;
  const detectionDensity = sim.totalDetections > 0 && sim.distanceCovered > 0
    ? +(sim.totalDetections / (sim.distanceCovered / 100)).toFixed(2) : 0;
  const patrolCoverage = +((sim.checkpointsDone / sim.totalCheckpoints) * 100).toFixed(1);

  const insights = [];

  // Security & Detection
  if (sim.intrusionAlert)
    insights.push({ level: 'critical', msg: 'INTRUSION ALERT — unauthorized access detected' });
  if (sim.unauthorizedAlert)
    insights.push({ level: 'critical', msg: 'Unauthorized person detected in restricted zone' });
  if (sim.humanDetected)
    insights.push({ level: 'warning', msg: `Human detected in ${sim.activeZone} — reviewing footage` });
  if (sim.motionDetected)
    insights.push({ level: 'info', msg: `Motion detected in ${sim.activeZone} at ${sim.lastMotionTime}` });
  if (sim.emergencyStop)
    insights.push({ level: 'critical', msg: 'Emergency stop active — robot halted' });
  if (sim.collisionAlert)
    insights.push({ level: 'critical', msg: 'Collision alert — obstacle in path' });
  if (sim.obstacleDetected)
    insights.push({ level: 'warning', msg: `Obstacle detected ${sim.proximityDist.toFixed(1)}m ahead` });

  // Battery
  if (sim.battery < 15)
    insights.push({ level: 'critical', msg: `Battery critical: ${sim.battery}% — initiate return to base` });
  else if (sim.battery < 25)
    insights.push({ level: 'warning', msg: `Low battery: ${sim.battery}% — plan RTB soon` });

  // Signal
  if (sim.signalStrength < 40)
    insights.push({ level: 'critical', msg: `Signal critically weak: ${sim.signalStrength}% — connection at risk` });
  else if (sim.signalStrength < 60)
    insights.push({ level: 'warning', msg: `Weak signal: ${sim.signalStrength}%` });

  // System health
  if (sim.cpuTemp > 75)
    insights.push({ level: 'critical', msg: `CPU overheating: ${sim.cpuTemp}°C` });
  else if (sim.cpuTemp > 65)
    insights.push({ level: 'warning', msg: `High CPU temp: ${sim.cpuTemp}°C` });
  if (sim.motorTemp > 60)
    insights.push({ level: 'warning', msg: `Motor temperature elevated: ${sim.motorTemp}°C` });
  if (sim.cpuUsage > 85)
    insights.push({ level: 'warning', msg: `High CPU load: ${sim.cpuUsage.toFixed(0)}%` });

  // Gas / Environment
  if (sim.smokeDetected)
    insights.push({ level: 'critical', msg: 'Smoke/gas detected — evacuate zone immediately' });
  if (sim.ambientTemp > 45)
    insights.push({ level: 'warning', msg: `High ambient temperature: ${sim.ambientTemp}°C` });

  // Analytics
  if (battDrainRate !== null)
    insights.push({ level: 'info', msg: `Battery drain rate: ${battDrainRate}%/s` });
  if (estimatedRuntime !== null)
    insights.push({ level: estimatedRuntime < 10 ? 'warning' : 'info', msg: `Estimated runtime remaining: ~${estimatedRuntime} min` });
  if (detectionDensity > 0)
    insights.push({ level: 'info', msg: `Detection density: ${detectionDensity} detections per 100m` });
  insights.push({ level: 'info', msg: `Patrol coverage: ${patrolCoverage}% (${sim.checkpointsDone}/${sim.totalCheckpoints} checkpoints)` });

  // Trends
  if (trend.alertCount?.direction === 'rising')
    insights.push({ level: 'warning', msg: 'Alert frequency increasing — heightened activity detected' });
  if (trend.battery?.direction === 'falling')
    insights.push({ level: 'info', msg: `Battery draining steadily (slope: ${trend.battery.slope}/tick)` });
  if (trend.signalStrength?.direction === 'falling')
    insights.push({ level: 'warning', msg: 'Signal strength degrading over time' });
  if (trend.cpuTemp?.direction === 'rising')
    insights.push({ level: 'info', msg: 'CPU temperature trending upward' });

  if (insights.length === 0)
    insights.push({ level: 'ok', msg: 'All surveillance systems nominal — area secure' });

  return {
    insights, anomalies, trend,
    health_score: Math.max(0, healthScore),
    derived: { battDrainRate, estimatedRuntime, detectionDensity, patrolCoverage },
  };
}

// ── Reusable UI Components ────────────────────────────────────────────────────
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
        <span style={{ color, fontWeight: '600' }}>{typeof value === 'number' ? value.toFixed(1) : value}</span>
      </div>
      <div style={{ height: '4px', background: '#111', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width 0.4s', borderRadius: '3px' }} />
      </div>
    </div>
  );
}

function AlertBadge({ label, active, level = 'warn' }) {
  const colors = { warn: '#ffb44d', danger: '#ff7d72', ok: '#79e49d', info: '#72c7ff' };
  const c = active ? colors[level] : '#2a2d3a';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: active ? `${c}18` : '#1e2130', borderRadius: '8px', border: `1px solid ${active ? c + '66' : '#2a2d3a'}` }}>
      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: c, boxShadow: active ? `0 0 6px ${c}` : 'none', flexShrink: 0 }} />
      <span style={{ fontSize: '12px', color: active ? c : '#444', fontWeight: active ? '600' : '400' }}>{label}</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SurveillanceDashboard({ deviceName }) {
  const [tab, setTab] = useState('overview');
  const tickRef = useRef(0);
  const battRef = useRef(88);
  const histRef = useRef({});
  const alertCountRef = useRef(0);
  const detectionCountRef = useRef(0);
  const distRef = useRef(0);
  const eventLogsRef = useRef([]);
  const [survAI, setSurvAI] = useState(null);

  const [sim, setSim] = useState({
    // Vision & Camera
    cameraOnline: true, fps: 30, resolution: '1080p',
    nightVision: false, zoomLevel: 1.0, panAngle: 0, tiltAngle: -15,
    // Movement
    posX: 0, posY: 0, speed: 0, heading: 0,
    distanceCovered: 0, waypointIdx: 0, totalWaypoints: 6,
    // Location
    gpsLat: 28.6139, gpsLng: 77.2090,
    activeZone: 'Sector A', geofenceOk: true, indoorZone: 'Building A',
    // Battery
    battery: 88, voltage: 24.0, charging: false, runtimeRem: 180,
    // Communication
    signalStrength: 92, latency: 38, connectionStatus: true, dataRate: 2.4,
    // System
    cpuUsage: 28, memUsage: 42, cpuTemp: 44, motorTemp: 38,
    nodeStatus: { camera: true, lidar: true, gps: true, imu: true, comms: true },
    errorLogs: [],
    // Security & Detection
    motionDetected: false, humanDetected: false, detectedObject: null,
    faceDetected: false, intrusionAlert: false, unauthorizedAlert: false,
    detectionRate: 0, totalDetections: 0,
    // Environmental
    ambientTemp: 28.5, humidity: 58, smokeDetected: false, lightIntensity: 750,
    // Safety
    obstacleDetected: false, collisionAlert: false, proximityDist: 5.0,
    emergencyStop: false,
    // Mission
    patrolMode: 'AUTO', currentTask: 'patrolling',
    checkpointsDone: 0, totalCheckpoints: 6,
    returnToBase: false, patrolSchedule: 'active',
    // Analytics
    alertCount: 0, eventLogs: [], lastMotionTime: '--',
    // UI state
    uptimeMin: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      tickRef.current += 1;
      const t = tickRef.current;
      battRef.current = Math.max(0, battRef.current - 0.008);

      setSim(prev => {
        const s = { ...prev };
        const cycle = t % 180;

        // Uptime
        s.uptimeMin = Math.floor(t / 60);

        // Battery
        s.battery = Math.round(battRef.current);
        s.voltage = +(24.0 - (88 - battRef.current) * 0.04).toFixed(2);
        s.runtimeRem = Math.max(0, Math.round(battRef.current * 2.05));
        s.charging = s.battery < 10;

        // Patrol cycle
        const zoneIdx = Math.floor(cycle / 30) % ZONES.length;
        s.activeZone = ZONES[zoneIdx];
        s.checkpointsDone = Math.min(s.totalCheckpoints, Math.floor(t / 30));
        s.waypointIdx = zoneIdx;

        // Movement
        if (cycle < 150) {
          s.patrolMode = 'AUTO';
          s.currentTask = 'patrolling';
          s.speed = +(0.8 + Math.random() * 0.4).toFixed(2);
          s.heading = (s.heading + 3) % 360;
          s.posX = +(s.posX + Math.cos(s.heading * Math.PI / 180) * 0.3).toFixed(2);
          s.posY = +(s.posY + Math.sin(s.heading * Math.PI / 180) * 0.3).toFixed(2);
          distRef.current += s.speed * 0.1;
          s.distanceCovered = +distRef.current.toFixed(1);
          s.gpsLat += 0.000005;
          s.gpsLng += 0.000004;
        } else {
          s.patrolMode = 'IDLE';
          s.currentTask = 'idle';
          s.speed = 0;
        }

        // Security & Detection
        s.motionDetected = Math.random() < 0.12;
        s.humanDetected = Math.random() < 0.06;
        s.faceDetected = s.humanDetected && Math.random() < 0.4;
        s.detectedObject = Math.random() < 0.08 ? OBJECT_LABELS[Math.floor(Math.random() * OBJECT_LABELS.length)] : null;
        s.intrusionAlert = Math.random() < 0.02;
        s.unauthorizedAlert = s.intrusionAlert && Math.random() < 0.5;

        if (s.motionDetected) {
          alertCountRef.current += 1;
          s.lastMotionTime = new Date().toLocaleTimeString();
        }
        if (s.humanDetected || s.detectedObject) {
          detectionCountRef.current += 1;
        }
        s.alertCount = alertCountRef.current;
        s.totalDetections = detectionCountRef.current;
        s.detectionRate = +(detectionCountRef.current / Math.max(1, t) * 60).toFixed(2);

        // Event log
        if (s.intrusionAlert) {
          const entry = { time: new Date().toLocaleTimeString(), type: 'INTRUSION', zone: s.activeZone, level: 'critical' };
          eventLogsRef.current = [entry, ...eventLogsRef.current].slice(0, 20);
        } else if (s.humanDetected) {
          const entry = { time: new Date().toLocaleTimeString(), type: 'HUMAN DETECTED', zone: s.activeZone, level: 'warning' };
          eventLogsRef.current = [entry, ...eventLogsRef.current].slice(0, 20);
        }
        s.eventLogs = eventLogsRef.current;

        // Camera
        s.fps = Math.round(28 + Math.random() * 4);
        s.panAngle = +(Math.sin(t * 0.05) * 45).toFixed(1);
        s.tiltAngle = +(-15 + Math.sin(t * 0.03) * 10).toFixed(1);
        s.nightVision = s.lightIntensity < 200;
        s.zoomLevel = +(1.0 + Math.sin(t * 0.02) * 0.5).toFixed(1);

        // Comms
        s.signalStrength = Math.min(100, Math.max(30, s.signalStrength + (Math.random() * 4 - 2)));
        s.latency = Math.round(35 + Math.random() * 20);
        s.dataRate = +(2 + Math.random() * 1).toFixed(2);
        s.connectionStatus = s.signalStrength > 20;

        // System
        s.cpuUsage = +(25 + Math.random() * 25 + (s.humanDetected ? 15 : 0)).toFixed(1);
        s.memUsage = +(40 + Math.random() * 15).toFixed(1);
        s.cpuTemp = +(42 + Math.random() * 8 + (s.cpuUsage > 70 ? 5 : 0)).toFixed(1);
        s.motorTemp = +(36 + Math.random() * 6 + (s.speed > 0 ? 4 : 0)).toFixed(1);
        s.nodeStatus = {
          camera: s.cameraOnline,
          lidar: true,
          gps: true,
          imu: true,
          comms: s.connectionStatus,
        };

        // Environment
        s.ambientTemp = +(28 + Math.random() * 2).toFixed(1);
        s.humidity = +(56 + Math.random() * 4).toFixed(1);
        s.lightIntensity = Math.round(700 + Math.sin(t * 0.01) * 300);
        s.smokeDetected = Math.random() < 0.005;

        // Safety
        s.proximityDist = +(2 + Math.random() * 6).toFixed(2);
        s.obstacleDetected = s.proximityDist < 1.5;
        s.collisionAlert = s.proximityDist < 0.5;
        s.emergencyStop = s.collisionAlert && Math.random() < 0.3;

        // Run AI every 2 ticks
        if (t % 2 === 0) {
          setSurvAI(analyzeSurveillance(s, histRef.current));
        }

        return s;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeAlerts = [sim.intrusionAlert, sim.unauthorizedAlert, sim.collisionAlert,
    sim.emergencyStop, sim.smokeDetected, sim.battery < 15, sim.signalStrength < 40].filter(Boolean).length;

  const uptimeStr = `${Math.floor(sim.uptimeMin / 60)}h ${sim.uptimeMin % 60}m`;
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const headingDir = dirs[Math.round(sim.heading / 45) % 8];

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'vision', label: 'Vision' },
    { id: 'movement', label: 'Movement' },
    { id: 'security', label: 'Security' },
    { id: 'battery', label: 'Battery' },
    { id: 'comms', label: 'Comms' },
    { id: 'system', label: 'System' },
    { id: 'environment', label: 'Environment' },
    { id: 'safety', label: 'Safety' },
    { id: 'mission', label: 'Mission' },
    { id: 'logs', label: 'Logs' },
    { id: 'ai', label: 'AI Insights' },
    { id: 'camera', label: 'Camera' },
  ];

  const levelColor = { critical: '#ff7d72', warning: '#ffb44d', info: '#72c7ff', ok: '#79e49d' };

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)', color: '#cde0df' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <span style={{ fontSize: '11px', color: '#7fa1a6', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Surveillance Dashboard</span>
          <h3 style={{ margin: '4px 0 0', color: '#cde0df' }}>{deviceName || 'Surveillance Robot'}</h3>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ background: '#1e2130', borderRadius: '8px', padding: '6px 14px', border: `1.5px solid ${sim.motionDetected ? '#ff7d7244' : '#79e49d44'}`, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: sim.motionDetected ? '#ff7d72' : '#79e49d', boxShadow: `0 0 6px ${sim.motionDetected ? '#ff7d72' : '#79e49d'}` }} />
            <span style={{ color: sim.motionDetected ? '#ff7d72' : '#79e49d', fontWeight: '600', fontSize: '13px' }}>
              {sim.motionDetected ? 'Motion Detected' : 'Area Clear'}
            </span>
          </div>
          <div style={{ background: '#1e2130', borderRadius: '8px', padding: '6px 14px', border: '1px solid #2a2d3a', fontSize: '12px', color: '#1ed0b5', fontWeight: '700' }}>
            {sim.patrolMode}
          </div>
          <div style={{ background: '#1e2130', borderRadius: '8px', padding: '6px 14px', border: '1px solid #2a2d3a', fontSize: '12px', color: '#a78bfa' }}>
            {sim.activeZone}
          </div>
          {activeAlerts > 0 && (
            <div style={{ background: '#ff7d7222', borderRadius: '8px', padding: '6px 14px', border: '1px solid #ff7d7266', fontSize: '12px', color: '#ff7d72', fontWeight: '700' }}>
              ⚠ {activeAlerts} Alert{activeAlerts > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.15s',
              background: tab === t.id ? '#1ed0b5' : '#1e2130',
              color: tab === t.id ? '#000' : '#7fa1a6',
              borderColor: tab === t.id ? '#1ed0b5' : '#2a2d3a',
            }}>
            {t.label}{t.id === 'security' && activeAlerts > 0 ? ` (${activeAlerts})` : ''}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === 'overview' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Camera" value={sim.cameraOnline ? 'Online' : 'Offline'} color={sim.cameraOnline ? '#79e49d' : '#ff7d72'} sub={`${sim.fps} FPS · ${sim.resolution}`} />
            <StatCard label="Battery" value={`${sim.battery}%`} color={sim.battery < 20 ? '#ff7d72' : '#79e49d'} warn={sim.battery < 20} sub={`${sim.voltage}V · ${sim.runtimeRem}min`} />
            <StatCard label="Signal" value={`${sim.signalStrength.toFixed(0)}%`} color={sim.signalStrength < 60 ? '#ff7d72' : '#1ed0b5'} warn={sim.signalStrength < 60} sub={`${sim.latency}ms latency`} />
            <StatCard label="Speed" value={sim.speed} unit="m/s" color="#72c7ff" sub={`Heading: ${headingDir}`} />
            <StatCard label="Zone" value={sim.activeZone} color="#a78bfa" sub={sim.indoorZone} />
            <StatCard label="Alerts" value={sim.alertCount} color={sim.alertCount > 10 ? '#ff7d72' : '#ffb44d'} warn={sim.alertCount > 10} sub="Total motion alerts" />
            <StatCard label="Detections" value={sim.totalDetections} color="#f472b6" sub={`${sim.detectionRate}/min rate`} />
            <StatCard label="Uptime" value={uptimeStr} color="#60a5fa" />
            <StatCard label="Distance" value={sim.distanceCovered} unit="m" color="#4ade80" sub="Covered today" />
          </div>
          <SectionTitle title="GPS Position" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div><span style={{ color: '#555', fontSize: '12px' }}>LAT </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLat.toFixed(6)}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>LNG </span><span style={{ color: '#cde0df', fontWeight: '600' }}>{sim.gpsLng.toFixed(6)}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>ZONE </span><span style={{ color: '#a78bfa', fontWeight: '600' }}>{sim.activeZone}</span></div>
            <div><span style={{ color: '#555', fontSize: '12px' }}>GEOFENCE </span><span style={{ color: sim.geofenceOk ? '#79e49d' : '#ff7d72', fontWeight: '600' }}>{sim.geofenceOk ? 'OK' : 'BREACH'}</span></div>
          </div>
        </div>
      )}

      {/* ── VISION & CAMERA ── */}
      {tab === 'vision' && (
        <div>
          <SectionTitle title="Camera Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Status" value={sim.cameraOnline ? 'Online' : 'Offline'} color={sim.cameraOnline ? '#79e49d' : '#ff7d72'} warn={!sim.cameraOnline} />
            <StatCard label="Frame Rate" value={sim.fps} unit="FPS" color="#72c7ff" />
            <StatCard label="Resolution" value={sim.resolution} color="#60a5fa" />
            <StatCard label="Night Vision" value={sim.nightVision ? 'ON' : 'OFF'} color={sim.nightVision ? '#a78bfa' : '#555'} sub={`Light: ${sim.lightIntensity} lux`} />
            <StatCard label="Zoom Level" value={`${sim.zoomLevel}x`} color="#fbbf24" />
            <StatCard label="Pan Angle" value={sim.panAngle} unit="°" color="#fb923c" />
            <StatCard label="Tilt Angle" value={sim.tiltAngle} unit="°" color="#fb923c" />
          </div>
        </div>
      )}

      {/* ── MOVEMENT & NAVIGATION ── */}
      {tab === 'movement' && (
        <div>
          <SectionTitle title="Position & Speed" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Position X" value={sim.posX} unit="m" color="#72c7ff" />
            <StatCard label="Position Y" value={sim.posY} unit="m" color="#72c7ff" />
            <StatCard label="Speed" value={sim.speed} unit="m/s" color="#79e49d" />
            <StatCard label="Heading" value={`${sim.heading.toFixed(0)}°`} unit={headingDir} color="#ffb44d" />
            <StatCard label="Distance Covered" value={sim.distanceCovered} unit="m" color="#4ade80" />
          </div>
          <SectionTitle title="Patrol Route" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Waypoint" value={`${sim.waypointIdx + 1}/${sim.totalWaypoints}`} color="#a78bfa" />
            <StatCard label="Active Zone" value={sim.activeZone} color="#1ed0b5" />
            <StatCard label="Task" value={sim.currentTask} color="#60a5fa" />
          </div>
          <SectionTitle title="Zone Progress" />
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {ZONES.map((z, i) => (
              <div key={z} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                background: sim.activeZone === z ? '#1ed0b522' : i < sim.waypointIdx ? '#79e49d11' : '#111',
                border: `1.5px solid ${sim.activeZone === z ? '#1ed0b5' : i < sim.waypointIdx ? '#79e49d55' : '#2a2d3a'}`,
                color: sim.activeZone === z ? '#1ed0b5' : i < sim.waypointIdx ? '#79e49d' : '#555',
              }}>{z}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── SECURITY & DETECTION ── */}
      {tab === 'security' && (
        <div>
          <SectionTitle title="Detection Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <AlertBadge label="Motion Detected" active={sim.motionDetected} level="warn" />
            <AlertBadge label="Human Detected" active={sim.humanDetected} level="danger" />
            <AlertBadge label="Face Detected" active={sim.faceDetected} level="warn" />
            <AlertBadge label="Intrusion Alert" active={sim.intrusionAlert} level="danger" />
            <AlertBadge label="Unauthorized Access" active={sim.unauthorizedAlert} level="danger" />
            <AlertBadge label={`Object: ${sim.detectedObject || 'None'}`} active={!!sim.detectedObject} level="warn" />
          </div>
          <SectionTitle title="Detection Stats" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Total Detections" value={sim.totalDetections} color="#f472b6" />
            <StatCard label="Detection Rate" value={sim.detectionRate} unit="/min" color="#fb923c" />
            <StatCard label="Alert Count" value={sim.alertCount} color={sim.alertCount > 10 ? '#ff7d72' : '#ffb44d'} warn={sim.alertCount > 10} />
            <StatCard label="Last Motion" value={sim.lastMotionTime} color="#a78bfa" />
          </div>
        </div>
      )}

      {/* ── BATTERY & POWER ── */}
      {tab === 'battery' && (
        <div>
          <SectionTitle title="Power Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Battery %" value={`${sim.battery}%`} color={sim.battery < 20 ? '#ff7d72' : sim.battery < 40 ? '#ffb44d' : '#79e49d'} warn={sim.battery < 20} />
            <StatCard label="Voltage" value={sim.voltage} unit="V" color="#fbbf24" />
            <StatCard label="Charging" value={sim.charging ? 'Yes' : 'No'} color={sim.charging ? '#79e49d' : '#555'} />
            <StatCard label="Runtime Remaining" value={sim.runtimeRem} unit="min" color={sim.runtimeRem < 20 ? '#ff7d72' : '#72c7ff'} warn={sim.runtimeRem < 20} />
          </div>
          <SectionTitle title="Battery Level" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Charge" value={sim.battery} color={sim.battery < 20 ? '#ff7d72' : sim.battery < 40 ? '#ffb44d' : '#79e49d'} />
            <BarStat label="Voltage" value={sim.voltage} max={30} color="#fbbf24" />
            <BarStat label="Runtime" value={sim.runtimeRem} max={240} color="#72c7ff" />
          </div>
        </div>
      )}

      {/* ── COMMUNICATION ── */}
      {tab === 'comms' && (
        <div>
          <SectionTitle title="Link Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Signal Strength" value={`${sim.signalStrength.toFixed(0)}%`} color={sim.signalStrength < 60 ? '#ff7d72' : '#1ed0b5'} warn={sim.signalStrength < 60} />
            <StatCard label="Latency" value={sim.latency} unit="ms" color={sim.latency > 100 ? '#ff7d72' : '#72c7ff'} />
            <StatCard label="Connection" value={sim.connectionStatus ? 'Online' : 'Offline'} color={sim.connectionStatus ? '#79e49d' : '#ff7d72'} warn={!sim.connectionStatus} />
            <StatCard label="Data Rate" value={sim.dataRate} unit="Mbps" color="#60a5fa" />
          </div>
          <SectionTitle title="Signal Trend" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Signal Strength" value={sim.signalStrength} color={sim.signalStrength < 60 ? '#ff7d72' : '#1ed0b5'} />
            <BarStat label="Data Rate" value={sim.dataRate} max={10} color="#60a5fa" />
          </div>
        </div>
      )}

      {/* ── SYSTEM HEALTH ── */}
      {tab === 'system' && (
        <div>
          <SectionTitle title="Compute" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="CPU Usage" value={`${sim.cpuUsage.toFixed(0)}%`} color={sim.cpuUsage > 80 ? '#ff7d72' : '#79e49d'} warn={sim.cpuUsage > 80} />
            <StatCard label="Memory Usage" value={`${sim.memUsage.toFixed(0)}%`} color={sim.memUsage > 80 ? '#ff7d72' : '#72c7ff'} warn={sim.memUsage > 80} />
            <StatCard label="CPU Temp" value={sim.cpuTemp} unit="°C" color={sim.cpuTemp > 70 ? '#ff7d72' : '#ffb44d'} warn={sim.cpuTemp > 70} />
            <StatCard label="Motor Temp" value={sim.motorTemp} unit="°C" color={sim.motorTemp > 55 ? '#ff7d72' : '#fb923c'} warn={sim.motorTemp > 55} />
          </div>
          <SectionTitle title="Usage" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="CPU" value={sim.cpuUsage} color={sim.cpuUsage > 80 ? '#ff7d72' : '#79e49d'} />
            <BarStat label="Memory" value={sim.memUsage} color="#72c7ff" />
            <BarStat label="CPU Temp" value={sim.cpuTemp} max={100} color="#ffb44d" />
            <BarStat label="Motor Temp" value={sim.motorTemp} max={80} color="#fb923c" />
          </div>
          <SectionTitle title="Node / Service Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
            {Object.entries(sim.nodeStatus).map(([node, alive]) => (
              <div key={node} style={{ background: '#1e2130', borderRadius: '10px', padding: '12px 16px', border: `1px solid ${alive ? '#79e49d33' : '#ff7d7233'}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: alive ? '#79e49d' : '#ff7d72', boxShadow: `0 0 5px ${alive ? '#79e49d' : '#ff7d72'}` }} />
                <span style={{ fontSize: '12px', color: alive ? '#cde0df' : '#ff7d72', fontWeight: '600', textTransform: 'uppercase' }}>{node}</span>
              </div>
            ))}
          </div>
          <SectionTitle title="Error Logs" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a', minHeight: '50px' }}>
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
          <SectionTitle title="Environmental Sensors" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Ambient Temp" value={sim.ambientTemp} unit="°C" color="#fb923c" />
            <StatCard label="Humidity" value={`${sim.humidity.toFixed(0)}%`} color="#60a5fa" />
            <StatCard label="Light Intensity" value={sim.lightIntensity} unit="lux" color="#fbbf24" sub={sim.lightIntensity < 200 ? 'Night mode' : 'Day mode'} />
            <StatCard label="Gas / Smoke" value={sim.smokeDetected ? 'DETECTED' : 'Clear'} color={sim.smokeDetected ? '#ff7d72' : '#79e49d'} warn={sim.smokeDetected} />
          </div>
          <SectionTitle title="Sensor Readings" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <BarStat label="Ambient Temp" value={sim.ambientTemp} max={50} color="#fb923c" />
            <BarStat label="Humidity" value={sim.humidity} color="#60a5fa" />
            <BarStat label="Light Intensity" value={sim.lightIntensity} max={1200} color="#fbbf24" />
          </div>
        </div>
      )}

      {/* ── SAFETY & OBSTACLES ── */}
      {tab === 'safety' && (
        <div>
          <SectionTitle title="Obstacle & Safety Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
            <AlertBadge label="Obstacle Detected" active={sim.obstacleDetected} level="warn" />
            <AlertBadge label="Collision Alert" active={sim.collisionAlert} level="danger" />
            <AlertBadge label="Emergency Stop" active={sim.emergencyStop} level="danger" />
            <AlertBadge label="Smoke / Gas Detected" active={sim.smokeDetected} level="danger" />
          </div>
          <SectionTitle title="Proximity" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Proximity Dist" value={sim.proximityDist} unit="m" color={sim.proximityDist < 1.5 ? '#ff7d72' : '#79e49d'} warn={sim.proximityDist < 1.5} sub={sim.proximityDist < 0.5 ? 'CRITICAL' : sim.proximityDist < 1.5 ? 'Warning zone' : 'Safe'} />
            <StatCard label="Emergency Stop" value={sim.emergencyStop ? 'ACTIVE' : 'Standby'} color={sim.emergencyStop ? '#ff7d72' : '#555'} warn={sim.emergencyStop} />
          </div>
        </div>
      )}

      {/* ── MISSION & PATROL ── */}
      {tab === 'mission' && (
        <div>
          <SectionTitle title="Patrol Status" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
            <StatCard label="Patrol Mode" value={sim.patrolMode} color="#72c7ff" />
            <StatCard label="Current Task" value={sim.currentTask} color="#79e49d" />
            <StatCard label="Schedule" value={sim.patrolSchedule} color="#60a5fa" />
            <StatCard label="Return to Base" value={sim.returnToBase ? 'Yes' : 'No'} color={sim.returnToBase ? '#ffb44d' : '#555'} />
          </div>
          <SectionTitle title="Checkpoint Progress" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '8px' }}>
              <span>Checkpoints: {sim.checkpointsDone} of {sim.totalCheckpoints}</span>
              <span style={{ color: '#1ed0b5' }}>{survAI?.derived?.patrolCoverage ?? 0}%</span>
            </div>
            <div style={{ height: '6px', background: '#111', borderRadius: '4px', overflow: 'hidden', marginBottom: '14px' }}>
              <div style={{ width: `${(sim.checkpointsDone / sim.totalCheckpoints) * 100}%`, height: '100%', background: '#1ed0b5', borderRadius: '4px', transition: 'width 0.5s' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {ZONES.map((z, i) => (
                <div key={z} style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                  background: i < sim.checkpointsDone ? '#79e49d11' : sim.activeZone === z ? '#1ed0b522' : '#111',
                  border: `1.5px solid ${i < sim.checkpointsDone ? '#79e49d' : sim.activeZone === z ? '#1ed0b5' : '#2a2d3a'}`,
                  color: i < sim.checkpointsDone ? '#79e49d' : sim.activeZone === z ? '#1ed0b5' : '#444',
                }}>{z}</div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── LOGS & ANALYTICS ── */}
      {tab === 'logs' && (
        <div>
          <SectionTitle title="Analytics Summary" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
            <StatCard label="Total Alerts" value={sim.alertCount} color="#ffb44d" />
            <StatCard label="Total Detections" value={sim.totalDetections} color="#f472b6" />
            <StatCard label="Detection Rate" value={sim.detectionRate} unit="/min" color="#fb923c" />
            <StatCard label="Distance Covered" value={sim.distanceCovered} unit="m" color="#4ade80" />
            <StatCard label="Patrol Coverage" value={`${survAI?.derived?.patrolCoverage ?? 0}%`} color="#1ed0b5" />
            <StatCard label="Detection Density" value={survAI?.derived?.detectionDensity ?? 0} unit="/100m" color="#a78bfa" />
          </div>
          <SectionTitle title="Event Log" />
          <div style={{ background: '#1e2130', borderRadius: '10px', border: '1px solid #2a2d3a', overflow: 'hidden' }}>
            {sim.eventLogs.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#444', fontSize: '13px' }}>No events recorded yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#161824' }}>
                    {['Time', 'Event', 'Zone', 'Level'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#555', fontWeight: '600', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sim.eventLogs.map((e, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #2a2d3a' }}>
                      <td style={{ padding: '10px 14px', color: '#555', fontFamily: 'monospace' }}>{e.time}</td>
                      <td style={{ padding: '10px 14px', color: levelColor[e.level] || '#cde0df', fontWeight: '600' }}>{e.type}</td>
                      <td style={{ padding: '10px 14px', color: '#a78bfa' }}>{e.zone}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ background: `${levelColor[e.level]}22`, color: levelColor[e.level], padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{e.level}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS ── */}
      {tab === 'ai' && (
        <div>
          <SectionTitle title="Analytics / Derived Data" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '4px' }}>
            <StatCard label="Battery Drain Rate" value={survAI?.derived?.battDrainRate ?? '—'} unit="%/s" color="#fbbf24" sub="Rolling 30s avg" />
            <StatCard label="Est. Runtime" value={survAI?.derived?.estimatedRuntime ?? sim.runtimeRem} unit="min" color={survAI?.derived?.estimatedRuntime < 10 ? '#ff7d72' : '#72c7ff'} warn={survAI?.derived?.estimatedRuntime < 10} sub="Based on drain rate" />
            <StatCard label="Detection Density" value={survAI?.derived?.detectionDensity ?? 0} unit="/100m" color="#f472b6" sub="Detections per 100m" />
            <StatCard label="Patrol Coverage" value={`${survAI?.derived?.patrolCoverage ?? 0}%`} color="#1ed0b5" sub={`${sim.checkpointsDone}/${sim.totalCheckpoints} checkpoints`} />
          </div>
          <SectionTitle title="System Health Score" />
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', border: '1px solid #2a2d3a', marginBottom: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Overall Health</span>
              <span style={{ fontWeight: '700', fontSize: '15px', color: survAI?.health_score > 70 ? '#79e49d' : survAI?.health_score > 40 ? '#ffb44d' : '#ff7d72' }}>
                {survAI?.health_score ?? 100}/100
              </span>
            </div>
            <div style={{ height: '8px', background: '#111', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: `${survAI?.health_score ?? 100}%`, height: '100%', borderRadius: '4px', transition: 'width 0.5s',
                background: survAI?.health_score > 70 ? '#79e49d' : survAI?.health_score > 40 ? '#ffb44d' : '#ff7d72',
              }} />
            </div>
          </div>
          {survAI && <AIInsights latest={{ ai: survAI }} />}
        </div>
      )}

      {/* ── CAMERA ── */}
      {tab === 'camera' && (
        <div>
          <SectionTitle title="Live Feed & Vision" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            <StatCard label="Pan Angle" value={sim.panAngle} unit="°" color="#fb923c" />
            <StatCard label="Tilt Angle" value={sim.tiltAngle} unit="°" color="#fb923c" />
            <StatCard label="Zoom" value={`${sim.zoomLevel}x`} color="#fbbf24" />
            <StatCard label="Night Vision" value={sim.nightVision ? 'ON' : 'OFF'} color={sim.nightVision ? '#a78bfa' : '#555'} />
          </div>
          <CameraModule />
        </div>
      )}

    </div>
  );
}
