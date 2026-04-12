import { useState, useEffect, useRef } from 'react';

const DEFAULT_URL = 'http://192.168.1.44:8080';
const LABELS = ['person', 'box', 'vehicle', 'obstacle', 'package'];
const LABEL_COLORS = { person: '#f87171', box: '#fbbf24', vehicle: '#60a5fa', obstacle: '#fb923c', package: '#4ade80' };

function randomBox(w, h) {
  const bw = 60 + Math.random() * 120;
  const bh = 50 + Math.random() * 100;
  return {
    x: Math.random() * (w - bw), y: Math.random() * (h - bh), w: bw, h: bh,
    label: LABELS[Math.floor(Math.random() * LABELS.length)],
    conf: (0.70 + Math.random() * 0.28).toFixed(2),
    life: 0, maxLife: 20 + Math.floor(Math.random() * 30),
  };
}

export default function CameraModule() {
  const [inputUrl, setInputUrl]       = useState(DEFAULT_URL);
  const [connected, setConnected]     = useState(false);
  const [frameSrc, setFrameSrc]       = useState('');
  const [fps, setFps]                 = useState(0);
  const [frameCount, setFrameCount]   = useState(0);
  const [motionLevel, setMotionLevel] = useState(0);
  const [detections, setDetections]   = useState([]);

  const canvasRef  = useRef(null);
  const pollRef    = useRef(null);
  const boxRef     = useRef(null);
  const fpsRef     = useRef(0);
  const urlRef     = useRef(DEFAULT_URL);

  const connect = () => {
    urlRef.current = inputUrl;
    setConnected(true);
  };

  const disconnect = () => {
    setConnected(false);
    setFrameSrc('');
    clearInterval(pollRef.current);
    clearInterval(boxRef.current);
  };

  // Start/stop polling shot.jpg
  useEffect(() => {
    if (!connected) return;
    pollRef.current = setInterval(() => {
      setFrameSrc(`${urlRef.current}/shot.jpg?t=${Date.now()}`);
      fpsRef.current++;
      setFrameCount(c => c + 1);
    }, 200);
    return () => clearInterval(pollRef.current);
  }, [connected]);

  // FPS counter
  useEffect(() => {
    const t = setInterval(() => { setFps(fpsRef.current); fpsRef.current = 0; }, 1000);
    return () => clearInterval(t);
  }, []);

  // Motion simulation
  useEffect(() => {
    if (!connected) return;
    const t = setInterval(() => {
      setMotionLevel(m => Math.min(100, Math.max(0, m + (Math.random() * 20 - 10))));
    }, 500);
    return () => clearInterval(t);
  }, [connected]);

  // Bounding box animation on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !connected) return;
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    let localBoxes = [];

    boxRef.current = setInterval(() => {
      if (Math.random() < 0.15 && localBoxes.length < 4) localBoxes.push(randomBox(W, H));
      localBoxes = localBoxes
        .map(b => ({ ...b, life: b.life + 1, x: b.x + (Math.random() * 2 - 1), y: b.y + (Math.random() * 1 - 0.5) }))
        .filter(b => b.life < b.maxLife);

      ctx.clearRect(0, 0, W, H);
      localBoxes.forEach(b => {
        const color = LABEL_COLORS[b.label] || '#fff';
        const alpha = Math.min(1, (b.maxLife - b.life) / 8);
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
        const cs = 10; ctx.lineWidth = 3;
        [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].forEach(([cx, cy], i) => {
          ctx.beginPath();
          ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy);
          ctx.lineTo(cx, cy);
          ctx.lineTo(cx, cy + (i < 2 ? cs : -cs));
          ctx.stroke();
        });
        ctx.globalAlpha = alpha * 0.85;
        ctx.fillStyle = color;
        ctx.fillRect(b.x, b.y - 20, b.label.length * 7 + 50, 18);
        ctx.globalAlpha = 1; ctx.fillStyle = '#000';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`${b.label} ${b.conf}`, b.x + 4, b.y - 6);
      });
      ctx.globalAlpha = 1;
      setDetections(localBoxes.map(b => ({ label: b.label, conf: b.conf })));
    }, 120);

    return () => { clearInterval(boxRef.current); ctx.clearRect(0, 0, W, H); };
  }, [connected]);

  const motionColor = motionLevel > 70 ? '#f87171' : motionLevel > 40 ? '#fbbf24' : '#4ade80';

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)', color: '#eee' }}>

      {/* URL bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="http://192.168.x.x:8080"
          style={{ flex: 1, background: '#1e2130', border: '1px solid #2a2d3a', borderRadius: '8px', padding: '8px 12px', color: '#cde0df', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
        />
        {!connected
          ? <button onClick={connect} style={{ background: '#1ed0b5', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Connect</button>
          : <button onClick={disconnect} style={{ background: '#f87171', color: '#000', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Disconnect</button>
        }
      </div>

      {/* Video area */}
      <div style={{ position: 'relative', background: '#0a0c12', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${connected ? '#1ed0b544' : '#2a2d3a'}`, minHeight: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {connected && frameSrc
          ? <img src={frameSrc} alt="live feed" style={{ width: '100%', display: 'block', maxHeight: '400px', objectFit: 'contain' }} />
          : <div style={{ textAlign: 'center', color: '#444' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📷</div>
              <div style={{ fontSize: '13px' }}>Press Connect to start stream</div>
              <div style={{ fontSize: '11px', color: '#333', marginTop: '6px', fontFamily: 'monospace' }}>{inputUrl}/shot.jpg</div>
            </div>
        }

        {/* Canvas overlay */}
        {connected && (
          <canvas ref={canvasRef} width={640} height={400}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
        )}

        {/* Status pills */}
        {connected && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end' }}>
            <div style={{ background: '#00000099', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#4ade80', fontWeight: '700' }}>● LIVE</div>
            <div style={{ background: '#00000099', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#fbbf24', fontFamily: 'monospace' }}>{fps} FPS</div>
            <div style={{ background: '#00000099', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#555', fontFamily: 'monospace' }}>Frame #{frameCount}</div>
          </div>
        )}
      </div>

      {/* Stats */}
      {connected && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginTop: '12px' }}>
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Motion Level</div>
            <div style={{ fontSize: '20px', fontWeight: '700', color: motionColor }}>{motionLevel.toFixed(0)}%</div>
            <div style={{ height: '4px', background: '#111', borderRadius: '3px', overflow: 'hidden', marginTop: '6px' }}>
              <div style={{ width: `${motionLevel}%`, height: '100%', background: motionColor, transition: 'width 0.4s' }} />
            </div>
          </div>
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Detections</div>
            {detections.length === 0
              ? <span style={{ fontSize: '12px', color: '#444' }}>Scanning...</span>
              : detections.slice(0, 3).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '3px' }}>
                    <span style={{ color: LABEL_COLORS[d.label] || '#fff', fontWeight: '600' }}>{d.label}</span>
                    <span style={{ color: '#555' }}>{d.conf}</span>
                  </div>
                ))
            }
          </div>
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Stream Info</div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Source: <span style={{ color: '#1ed0b5' }}>IP Webcam</span></div>
            <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Mode: <span style={{ color: '#60a5fa' }}>JPEG Poll</span></div>
            <div style={{ fontSize: '12px', color: '#888' }}>Rate: <span style={{ color: '#fbbf24' }}>5 FPS</span></div>
          </div>
          <div style={{ background: '#1e2130', borderRadius: '10px', padding: '14px', border: '1px solid #2a2d3a' }}>
            <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href={`${inputUrl}/shot.jpg`} target="_blank" rel="noreferrer"
                style={{ background: '#2a2d3a', borderRadius: '6px', padding: '6px 10px', color: '#cde0df', fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>
                📸 Snapshot
              </a>
              <a href={inputUrl} target="_blank" rel="noreferrer"
                style={{ background: '#2a2d3a', borderRadius: '6px', padding: '6px 10px', color: '#cde0df', fontSize: '12px', textAlign: 'center', textDecoration: 'none' }}>
                🌐 Open App
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
