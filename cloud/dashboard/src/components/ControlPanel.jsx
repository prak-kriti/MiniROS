export default function ControlPanel({ onCommand }) {
  const btn = (label, action, extraClass = '') => (
    <button
      onClick={() => onCommand(action)}
      className={`control-button ${extraClass}`.trim()}
    >
      {label}
    </button>
  );

  return (
    <section className="command-card panel">
      <h3>Robot Control</h3>
      <p>Dispatch manual override commands while the edge node continues streaming telemetry.</p>
      <div className="command-grid" style={{ marginTop: '18px' }}>
        <div className="command-slot" />
        {btn('Forward', 'move_forward')}
        <div className="command-slot" />
        {btn('Left', 'turn_left')}
        {btn('Stop', 'stop', 'stop')}
        {btn('Right', 'turn_right')}
        <div className="command-slot" />
        {btn('Backward', 'move_backward')}
        <div className="command-slot" />
      </div>
    </section>
  );
}
