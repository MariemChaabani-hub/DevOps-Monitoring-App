/**
 * Backend API client. Base URL is fixed (see config/constants.js) — no
 * runtime server-URL override. Auth is dual-header for remote-actions
 * endpoints: `Authorization: Bearer <jwt>` (checked by the backend's
 * app-level verifyToken middleware) plus `x-admin-email` (checked by the
 * route-level requireAdmin middleware, which looks up the user's role in
 * MongoDB). Both are attached unconditionally by the request interceptor;
 * they're harmless no-ops on the read-only endpoints that ignore them.
 */
import axios from 'axios';
import { APP_CONFIG } from '../config/constants';

// Current session, written by AuthContext whenever token/email change.
// apiService is a plain module (not a component) so it can't call
// useAuth() itself — this is the bridge between the two.
let session = { token: null, email: null };

export const setSession = (next) => {
  session = next || { token: null, email: null };
};

const api = axios.create({
  baseURL: APP_CONFIG.API_BASE_URL,
  timeout: APP_CONFIG.API_TIMEOUT,
  headers: APP_CONFIG.API_HEADERS,
});

api.interceptors.request.use((config) => {
  if (session.token) {
    config.headers['Authorization'] = `Bearer ${session.token}`;
  }
  if (session.email) {
    config.headers['x-admin-email'] = session.email;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status, data } = error.response;
      switch (status) {
        case 401:
          throw new Error(data?.message || APP_CONFIG.MESSAGES.ERROR_UNAUTHORIZED);
        case 403:
          throw new Error(data?.message || APP_CONFIG.MESSAGES.ERROR_FORBIDDEN);
        case 404:
          throw new Error(data?.message || APP_CONFIG.MESSAGES.ERROR_NOT_FOUND);
        case 500:
          throw new Error(data?.message || APP_CONFIG.MESSAGES.ERROR_SERVER);
        default:
          throw new Error(data?.message || data?.error || 'Erreur inconnue');
      }
    }
    throw new Error(APP_CONFIG.MESSAGES.ERROR_NETWORK);
  }
);

export const apiService = {
  // Auth
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),

  // Servers
  getServers: () => api.get('/servers'),
  getServer: (serverId) => api.get(`/servers/${serverId}`),
  getServerMetrics: (serverId, { limit = 100, minutes = 60 } = {}) =>
    api.get(`/servers/${serverId}/metrics`, { params: { limit, minutes } }),

  // Dashboard
  getDashboardSummary: () => api.get('/dashboard/summary'),

  // Alerts
  getAlerts: ({ status = 'ACTIVE', severity, server_id, limit = 100 } = {}) =>
    api.get('/alerts', { params: { status, severity, server_id, limit } }),
  acknowledgeAlert: (alertId, acknowledgedBy) =>
    api.put(`/alerts/${alertId}/acknowledge`, { acknowledged_by: acknowledgedBy }),

  // Remote actions / services (dual-auth)
  getServicesStatus: (serverId) => api.get(`/remote-actions/${serverId}/services-status`),
  restartService: (serverId, serviceName) =>
    api.post(`/remote-actions/${serverId}/restart-service`, { service_name: serviceName }),
  stopService: (serverId, serviceName) =>
    api.post(`/remote-actions/${serverId}/stop-service`, { service_name: serviceName }),
  restartServer: (serverId, delay = 30) =>
    api.post(`/remote-actions/${serverId}/restart`, { delay }),
};

export default apiService;
