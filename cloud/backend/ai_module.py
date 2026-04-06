"""
AI Analysis Module - LFR Version
- Detects anomalies using Z-score
- Detects trends using linear regression
- LFR-specific insights (line state, PID error, motor imbalance)
"""
import numpy as np
from collections import deque
from typing import Dict, Any


class AIAnalyzer:
    def __init__(self, window=30):
        self.history = {
            'speed': deque(maxlen=window),
            'battery_pct': deque(maxlen=window),
            'temperature': deque(maxlen=window),
            'pid_error': deque(maxlen=window),
        }
        self.window = window

    def analyze(self, record: Dict[str, Any]) -> Dict[str, Any]:
        for field in self.history:
            if field in record:
                self.history[field].append(record[field])

        result = {
            'anomalies': [],
            'trend': {},
            'insights': [],
            'health_score': 100
        }

        for field in self.history:
            values = list(self.history[field])
            if len(values) < 5:
                continue

            arr = np.array(values)
            current = arr[-1]
            mean = arr.mean()
            std = arr.std()

            if std > 0:
                z = abs((current - mean) / std)
                if z > 2.5:
                    result['anomalies'].append({
                        'field': field,
                        'value': round(current, 2),
                        'z_score': round(z, 2),
                        'message': f'{field} is {z:.1f}σ from recent average ({mean:.1f})'
                    })
                    result['health_score'] -= 15

            if len(values) >= 10:
                x = np.arange(len(values))
                slope = np.polyfit(x, values, 1)[0]
                direction = 'rising' if slope > 0.05 else 'falling' if slope < -0.05 else 'stable'
                result['trend'][field] = {
                    'direction': direction,
                    'slope': round(float(slope), 4)
                }

        result['insights'] = self._generate_insights(record, result)
        result['health_score'] = max(0, result['health_score'])
        return result

    def _generate_insights(self, record, analysis) -> list:
        insights = []

        # LFR specific checks
        state = record.get('line_state', '')
        error = abs(record.get('pid_error', 0))
        sensors = record.get('ir_sensors', [])
        battery_pct = record.get('battery_pct', 100)
        left = record.get('motor_left', 0)
        right = record.get('motor_right', 0)
        temp = record.get('temperature', 25)

        if state == 'lost_line':
            insights.append({'level': 'critical', 'msg': 'LFR has lost the line'})

        if error > 1.5:
            insights.append({'level': 'warning', 'msg': f'High tracking error: {error:.2f} — sharp turn or misalignment'})

        if sum(sensors) == 0 and state != 'lost_line':
            insights.append({'level': 'warning', 'msg': 'All IR sensors dark — possible sensor fault'})

        if abs(left - right) > 100:
            insights.append({'level': 'info', 'msg': f'Motor imbalance: L={left} R={right}'})

        if battery_pct < 20:
            insights.append({'level': 'critical', 'msg': f'Battery critically low: {battery_pct:.0f}%'})
        elif battery_pct < 40:
            insights.append({'level': 'warning', 'msg': f'Battery below 40%: {battery_pct:.0f}%'})

        if temp > 45:
            insights.append({'level': 'critical', 'msg': f'High temperature: {temp:.1f}°C'})
        elif temp > 35:
            insights.append({'level': 'warning', 'msg': f'Elevated temperature: {temp:.1f}°C'})

        for anomaly in analysis['anomalies']:
            insights.append({'level': 'warning', 'msg': anomaly['message']})

        for field, trend in analysis.get('trend', {}).items():
            if field == 'battery_pct' and trend['direction'] == 'falling':
                insights.append({'level': 'info', 'msg': f'Battery draining steadily (slope: {trend["slope"]:.3f}%/s)'})
            if field == 'temperature' and trend['direction'] == 'rising':
                insights.append({'level': 'info', 'msg': 'Temperature trending upward'})

        if not insights:
            insights.append({'level': 'ok', 'msg': 'LFR tracking normally'})

        return insights