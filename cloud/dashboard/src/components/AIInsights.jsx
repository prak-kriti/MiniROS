export default function AIInsights({ latest }) {
  if (!latest?.ai) return null;

  const { insights, anomalies, trend, health_score } = latest.ai;

  const levelColor = { ok: '#4ade80', info: '#60a5fa', warning: '#fbbf24', critical: '#f87171' };

  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '14px', color: '#aaa' }}>AI Insights</h3>
        <span style={{ fontSize: '13px', color: '#fbbf24' }}>
          System Health: {health_score}/100
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {insights.map((insight, i) => (
          <div key={i} style={{
            padding: '6px 12px',
            borderRadius: '20px',
            background: 'rgba(255,255,255,0.05)',
            borderLeft: `3px solid ${levelColor[insight.level] || '#666'}`,
            fontSize: '13px',
            color: '#ccc'
          }}>
            {insight.msg}
          </div>
        ))}
      </div>

      {anomalies?.length > 0 && (
        <div style={{ marginTop: '12px', fontSize: '12px', color: '#f87171' }}>
          ⚠ {anomalies.length} anomaly detected in recent data
        </div>
      )}
    </div>
  );
}