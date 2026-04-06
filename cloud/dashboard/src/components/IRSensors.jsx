export default function IRSensors({ sensors }) {
  if (!sensors) return null;
  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px', marginBottom: '20px' }}>
      <div style={{ fontSize: '13px', color: '#888', marginBottom: '10px' }}>IR sensor array</div>
      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        {sensors.map((val, i) => (
          <div key={i} style={{
            width: '44px', height: '44px', borderRadius: '8px',
            background: val ? '#1a1a1a' : '#f5f5f5',
            border: `2px solid ${val ? '#888' : '#ddd'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', color: val ? '#888' : '#333',
            transition: 'all 0.15s'
          }}>
            S{i}
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', fontSize: '11px', color: '#555', marginTop: '6px' }}>
        black = line detected
      </div>
    </div>
  );
}