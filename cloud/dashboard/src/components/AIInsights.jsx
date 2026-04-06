export default function AIInsights({ latest }) {
  if (!latest?.ai) return null;

  const { insights, anomalies, trend, health_score } = latest.ai;
  const levelColor = { ok: '#79e49d', info: '#72c7ff', warning: '#ffb44d', critical: '#ff7d72' };

  const formatValue = (value) => {
    if (value == null) return '';
    if (typeof value === 'number') return value.toFixed(2);
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.map(formatValue).join(', ');
    if (typeof value === 'object') {
      if ('direction' in value || 'slope' in value) {
        const parts = [];
        if (value.direction) parts.push(value.direction);
        if (typeof value.slope === 'number') parts.push(`slope ${value.slope.toFixed(4)}`);
        return parts.join(' ');
      }
      return Object.entries(value)
        .map(([key, nested]) => `${key} ${formatValue(nested)}`.trim())
        .join(', ');
    }
    return String(value);
  };

  const trendText =
    trend == null
      ? ''
      : typeof trend === 'string'
        ? trend
        : Object.entries(trend)
            .map(([key, value]) => `${key}: ${formatValue(value)}`)
            .join(' | ');

  return (
    <section className="panel" style={{ padding: '22px' }}>
      <div className="section-heading">
        <div>
          <h3 style={{ margin: 0, fontFamily: 'var(--sans)', letterSpacing: '-0.03em' }}>AI Insights</h3>
          <p className="section-copy" style={{ marginTop: '8px' }}>
            Runtime interpretation layer for anomalies, trends, and system condition.
          </p>
        </div>
        <span className="floating-tag" style={{ color: '#ffb44d' }}>
          System Health: {health_score}/100
        </span>
      </div>

      <div className="insight-list">
        {(insights ?? []).map((insight, i) => (
          <div
            key={i}
            className="insight-chip"
            style={{ borderLeft: `4px solid ${levelColor[insight.level] || '#7fa1a6'}` }}
          >
            {insight.msg}
          </div>
        ))}
      </div>

      {anomalies?.length > 0 && (
        <div className="alert alert-error" style={{ marginTop: '14px' }}>
          {anomalies.length} anomaly signal{anomalies.length > 1 ? 's' : ''} detected in recent data.
        </div>
      )}

      {trendText && (
        <p className="form-note" style={{ marginTop: '14px' }}>
          Trend summary: {trendText}
        </p>
      )}
    </section>
  );
}
