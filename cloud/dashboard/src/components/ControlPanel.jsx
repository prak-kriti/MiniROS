export default function ControlPanel({ onCommand }) {
  const btn = (label, action, color = '#334155') => (
    <button
      onClick={() => onCommand(action)}
      style={{
        padding: '12px 0', background: color, border: 'none',
        borderRadius: '8px', color: '#fff', cursor: 'pointer',
        fontSize: '14px', fontWeight: '500', width: '100%'
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '14px', color: '#aaa' }}>Robot Control</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <div />
        {btn('▲ Forward', 'move_forward')}
        <div />
        {btn('◀ Left', 'turn_left')}
        {btn('■ Stop', 'stop', '#7f1d1d')}
        {btn('▶ Right', 'turn_right')}
        <div />
        {btn('▼ Back', 'move_backward')}
        <div />
      </div>
    </div>
  );
}