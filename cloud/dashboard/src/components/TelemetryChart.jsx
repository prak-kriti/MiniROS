import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TelemetryChart({ data }) {
  const labels = data.map(d => new Date(d.timestamp * 1000).toLocaleTimeString());
  
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Speed (m/s)',
        data: data.map(d => d.speed),
        borderColor: '#60a5fa',
        backgroundColor: 'rgba(96,165,250,0.1)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Temperature (°C)',
        data: data.map(d => d.temperature),
        borderColor: '#f472b6',
        backgroundColor: 'rgba(244,114,182,0.1)',
        tension: 0.3,
        pointRadius: 0,
      },
      {
        label: 'Battery (%)',
        data: data.map(d => d.battery_pct),
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.1)',
        tension: 0.3,
        pointRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    animation: false,   // disable for real-time performance
    plugins: {
      legend: { labels: { color: '#ccc', font: { size: 12 } } },
    },
    scales: {
      x: { ticks: { color: '#666', maxTicksLimit: 8 }, grid: { color: '#2a2a3a' } },
      y: { ticks: { color: '#666' }, grid: { color: '#2a2a3a' } },
    },
  };

  return (
    <div style={{ background: '#1e2130', borderRadius: '10px', padding: '16px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: '#aaa' }}>Live Telemetry</h3>
      <Line data={chartData} options={options} />
    </div>
  );
}