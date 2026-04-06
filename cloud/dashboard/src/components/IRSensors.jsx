export default function IRSensors({ sensors }) {
  if (!sensors) return null;

  return (
    <section className="sensor-panel panel">
      <div className="sensor-title">IR Sensor Array</div>
      <p className="sensor-caption">Line-tracking state from left to right across the five-sensor strip.</p>
      <div className="sensor-strip">
        {sensors.map((val, i) => (
          <div key={i} className={`sensor-node ${val ? 'active' : 'inactive'}`}>
            S{i}
          </div>
        ))}
      </div>
      <div className="form-note" style={{ textAlign: 'center', marginTop: '10px' }}>
        Active sensors indicate line detection.
      </div>
    </section>
  );
}
