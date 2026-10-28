// api/client.js — one axios instance for the whole app.
// Login is a JWT in an httpOnly cookie set by the backend. `withCredentials: true`
// makes the browser send that cookie with every request — no token handling here.
import axios from 'axios';

const API_ORIGIN = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE = `${API_ORIGIN}/api`;
export { API_ORIGIN };

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  timeout: 30000,
});

// When the login cookie expires, the AuthContext is told so it can show the login page.
let onLoggedOut = () => {};
export function onSessionExpired(fn) {
  onLoggedOut = fn;
}

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) onLoggedOut();
    return Promise.reject(error);
  },
);

/** Readable error message from any failed request. */
export function apiError(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error) return err.response.data.error;
  if (err?.code === 'ECONNABORTED') return 'The request timed out. Check your connection and try again.';
  if (err?.message === 'Network Error') return 'Cannot reach the server. Check your internet connection.';
  return fallback;
}

/** Field-level validation errors → { field: message } */
export function fieldErrors(err) {
  const out = {};
  for (const d of err?.response?.data?.details || []) if (d.field && !out[d.field]) out[d.field] = d.message;
  return out;
}

/** Absolute URL for an uploaded image ("/uploads/..." or a full Google avatar URL). */
export function mediaUrl(url) {
  if (!url) return null;
  if (/^https?:\/\//.test(url)) return url;
  return `${API_ORIGIN}${url}`;
}

export default api;
