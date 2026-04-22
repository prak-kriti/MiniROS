import { useState, useEffect, useRef, useCallback } from 'react';

const DEFAULT_URL = 'http://192.168.1.44:8080';
// In dev: Vite proxy (/cam-proxy) runs on host → can reach Tailscale/LAN
// In prod: backend proxy (/camera/frame) used — camera must be reachable from server
const DEV  = import.meta.env.DEV;
const BACKEND = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const frameUrl = (cameraBase) => DEV
  ? `/cam-proxy?url=${encodeURIComponent(cameraBase)}&t=${Date.now()}`
  : `${BACKEND}/camera/frame?url=${encodeURIComponent(cameraBase)}&t=${Date.now()}`;
const CANVAS_W    = 640;
const CANVAS_H    = 360;

const LABEL_FIX = {
  dining_table: 'table', dining: 'table',
  'dining table': 'table',
  tv: 'monitor/TV',
  cell_phone: 'phone',
  'cell phone': 'phone',
  potted_plant: 'plant',
  'potted plant': 'plant',
  teddy_bear: 'toy',
  'teddy bear': 'toy',
  backpack: 'bag',
  handbag: 'bag',
  suitcase: 'bag',
};

const COLORS = {
  person: '#f87171', car: '#60a5fa', truck: '#60a5fa', bus: '#60a5fa',
  motorcycle: '#a78bfa', bicycle: '#93c5fd', cat: '#fbbf24', dog: '#fbbf24',
  bottle: '#4ade80', cup: '#4ade80', cell_phone: '#fb923c',
};
const color = (label) => COLORS[label] || '#1ed0b5';

export default function CameraModule() {
  const [inputUrl, setInputUrl]   = useState(DEFAULT_URL);
  const [connected, setConnected] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const [detections, setDetections] = useState([]);
  const [fps, setFps]             = useState(0);
  const [status, setStatus]       = useState('');

  const canvasRef      = useRef(null);
  const modelRef       = useRef(null);
  const detectionsRef  = useRef([]);
  const frameTimerRef  = useRef(null);
  const detectTimerRef = useRef(null);
  const fpsTimerRef    = useRef(null);
  const fpsCountRef    = useRef(0);
  const urlRef         = useRef(DEFAULT_URL);

  // Load COCO-SSD once on mount
  useEffect(() => {
    setStatus('Loading AI model...');
    let alive = true;
    (async () => {
      await import('@tensorflow/tfjs');
      const cocoSsd = await import('@tensorflow-models/coco-ssd');
      const model   = await cocoSsd.load({ base: 'mobilenet_v2' });
      if (alive) { modelRef.current = model; setModelReady(true); setStatus(''); }
    })();
    return () => { alive = false; };
  }, []);

  const drawBoxes = useCallback((ctx, dets) => {
    dets.forEach(({ label, score, bbox }) => {
      const [x, y, w, h] = bbox;
      const c = color(label);
      ctx.strokeStyle = c; ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = c;
      const txt = `${label} ${(score * 100).toFixed(0)}%`;
      const tw   = ctx.measureText(txt).width + 8;
      ctx.fillRect(x, y - 18, tw, 18);
      ctx.fillStyle = '#000'; ctx.font = 'bold 11px monospace';
      ctx.fillText(txt, x + 4, y - 5);
    });
  }, []);

  const pollFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      // Cover: scale image to fill canvas (landscape stretch)
      const scale = Math.max(CANVAS_W / img.naturalWidth, CANVAS_H / img.naturalHeight);
      const sw = img.naturalWidth  * scale;
      const sh = img.naturalHeight * scale;
      const ox = (CANVAS_W - sw) / 2;
      const oy = (CANVAS_H - sh) / 2;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.drawImage(img, ox, oy, sw, sh);
      drawBoxes(ctx, detectionsRef.current);
      fpsCountRef.current++;
    };
    img.onerror = () => setStatus('Camera unreachable — check URL or IP Webcam app');
    img.src = frameUrl(urlRef.current);
  }, [drawBoxes]);

  const runDetection = useCallback(async () => {
    const canvas = canvasRef.current;
    const model  = modelRef.current;
    if (!canvas || !model) return;
    try {
      const results = await model.detect(canvas, 10, 0.45);
      detectionsRef.current = results.map(d => ({
        label: LABEL_FIX[d.class] || d.class, score: d.score, bbox: d.bbox,
      }));
      setDetections([...detectionsRef.current]);
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!connected) return;
    urlRef.current = inputUrl;
    setStatus('');

    frameTimerRef.current  = setInterval(pollFrame, 200);
    detectTimerRef.current = setInterval(runDetection, 800);
    fpsTimerRef.current    = setInterval(() => {
      setFps(fpsCountRef.current);
      fpsCountRef.current = 0;
    }, 1000);

    return () => {
      clearInterval(frameTimerRef.current);
      clearInterval(detectTimerRef.current);
      clearInterval(fpsTimerRef.current);
      detectionsRef.current = [];
      setDetections([]);
    };
  }, [connected, inputUrl, pollFrame, runDetection]);

  const connect    = () => { urlRef.current = inputUrl; setConnected(true); };
  const disconnect = () => setConnected(false);

  return (
    <div style={{ fontFamily: 'var(--sans, sans-serif)', color: 'var(--text, #0d2420)' }}>

      {/* URL bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', alignItems: 'center' }}>
        <input
          value={inputUrl}
          onChange={e => setInputUrl(e.target.value)}
          placeholder="http://192.168.x.x:8080"
          disabled={connected}
          style={{ flex: 1, background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(30,208,181,0.3)', borderRadius: '8px', padding: '8px 12px', color: '#0d2420', fontSize: '13px', fontFamily: 'monospace', outline: 'none' }}
        />
        {!connected
          ? <button onClick={connect}    style={{ background: modelReady ? '#1ed0b5' : '#aaa', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', cursor: modelReady ? 'pointer' : 'not-allowed' }} disabled={!modelReady}>
              {modelReady ? 'Connect' : 'Loading AI...'}
            </button>
          : <button onClick={disconnect} style={{ background: '#e53e3e', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>Disconnect</button>
        }
      </div>

      {status && <div style={{ fontSize: '12px', color: '#d97706', marginBottom: '10px' }}>{status}</div>}

      {/* Canvas — always mounted so model can detect on it */}
      <div style={{ position: 'relative', background: '#e8f5f3', borderRadius: '12px', overflow: 'hidden', border: `1px solid ${connected ? 'rgba(30,208,181,0.4)' : 'rgba(30,208,181,0.18)'}` }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {!connected && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#5a8a84' }}>
            <div style={{ fontSize: '36px', marginBottom: '10px' }}>📷</div>
            <div style={{ fontSize: '13px' }}>Enter IP Webcam address and press Connect</div>
          </div>
        )}
        {connected && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', gap: '5px', alignItems: 'flex-end', pointerEvents: 'none' }}>
            <div style={{ background: 'rgba(30,208,181,0.88)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#fff', fontWeight: '700' }}>● LIVE</div>
            <div style={{ background: 'rgba(255,255,255,0.88)', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#0c8f7b', fontFamily: 'monospace' }}>{fps} FPS</div>
          </div>
        )}
      </div>

      {/* Detections + Actions */}
      {connected && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(30,208,181,0.2)' }}>
            <div style={{ fontSize: '10px', color: '#5a8a84', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>AI Detections</div>
            {detections.length === 0
              ? <span style={{ fontSize: '12px', color: '#aaa' }}>No objects detected</span>
              : detections.slice(0, 5).map((d, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                    <span style={{ color: color(d.label), fontWeight: '600' }}>{d.label}</span>
                    <span style={{ color: '#5a8a84' }}>{(d.score * 100).toFixed(0)}%</span>
                  </div>
                ))
            }
          </div>
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(30,208,181,0.2)' }}>
            <div style={{ fontSize: '10px', color: '#5a8a84', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Quick Actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <a href={`${inputUrl}/shot.jpg`} target="_blank" rel="noreferrer"
                style={{ background: 'rgba(30,208,181,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#0c8f7b', fontSize: '12px', textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(30,208,181,0.22)' }}>
                Snapshot
              </a>
              <a href={inputUrl} target="_blank" rel="noreferrer"
                style={{ background: 'rgba(30,208,181,0.1)', borderRadius: '6px', padding: '6px 10px', color: '#0c8f7b', fontSize: '12px', textAlign: 'center', textDecoration: 'none', border: '1px solid rgba(30,208,181,0.22)' }}>
                Open App
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
