import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TelemetryChart({ data }) {
  const labels = data.map((d) => new Date(d.timestamp * 1000).toLocaleTimeString());

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Speed (m/s)',
        data: data.map((d) => d.speed),
        borderColor: '#72c7ff',
        backgroundColor: 'rgba(114, 199, 255, 0.12)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Temperature (C)',
        data: data.map((d) => d.temperature),
        borderColor: '#ffb44d',
        backgroundColor: 'rgba(255, 180, 77, 0.12)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Battery (%)',
        data: data.map((d) => d.battery_pct),
        borderColor: '#79e49d',
        backgroundColor: 'rgba(121, 228, 157, 0.12)',
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false,
    plugins: {
      legend: { labels: { color: '#cde0df', font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { color: '#7fa1a6', maxTicksLimit: 8 }, grid: { color: 'rgba(148, 181, 186, 0.12)' } },
      y: { ticks: { color: '#7fa1a6' }, grid: { color: 'rgba(148, 181, 186, 0.12)' } },
    },
  };

  return (
    <section className="chart-panel panel">
      <div className="chart-header">
        <div>
          <h3>Live Telemetry</h3>
          <p className="chart-subtitle">Speed, battery reserve, and thermal drift from the edge stream.</p>
        </div>
        <span className="floating-tag">Last {data.length} samples</span>
      </div>
      <Line data={chartData} options={options} />
    </section>
  );
}
