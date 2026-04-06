import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({ baseURL: BASE_URL });

// Attach JWT to every request if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────
export const signup = (email, username, password) =>
  api.post('/auth/signup', { email, username, password }).then(r => r.data);

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

// ── Devices ───────────────────────────────────────────────────────────────────
export const getDevices = () =>
  api.get('/devices').then(r => r.data);

export const addDevice = (device_name) =>
  api.post('/devices', { device_name }).then(r => r.data);

export const deleteDevice = (id) =>
  api.delete(`/devices/${id}`).then(r => r.data);

// ── Device data ───────────────────────────────────────────────────────────────
export const getDeviceData = (deviceId, limit = 100) =>
  api.get(`/devices/${deviceId}/data?limit=${limit}`).then(r => r.data);

export const pushDeviceData = (deviceId, data) =>
  api.post(`/devices/${deviceId}/data`, { data }).then(r => r.data);

export default api;
