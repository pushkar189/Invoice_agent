import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 10 min for AI operations
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoicesApi = {
  upload: (formData, onProgress) =>
    api.post('/invoices/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    }),
  list: (params) => api.get('/invoices', { params }),
  get: (id) => api.get(`/invoices/${id}`),
  update: (id, data) => api.put(`/invoices/${id}`, data),
  delete: (id) => api.delete(`/invoices/${id}`),
  downloadUrl: (id) => `/api/invoices/${id}/download`,
  getFlags: (id) => api.get(`/invoices/${id}/flags`),
  resolveFlag: (id, flagId) => api.put(`/invoices/${id}/flags/${flagId}`),
};

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get('/dashboard/stats'),
  monthly: () => api.get('/dashboard/monthly'),
  status: () => api.get('/dashboard/status'),
  recent: () => api.get('/dashboard/recent'),
};

// ── Agent ─────────────────────────────────────────────────────────────────────
export const agentApi = {
  chat: (message) => api.post('/agent/chat', { message }),
};

// ── Health ────────────────────────────────────────────────────────────────────
export const healthApi = {
  check: () => api.get('/health'),
};

export default api;
