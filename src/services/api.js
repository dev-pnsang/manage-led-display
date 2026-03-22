import axios from 'axios';
import {
  getStoredToken,
  getAuthHeaderMode,
  clearSession,
} from './storage';

const baseURL =
  import.meta.env.VITE_MAIN_SERVER?.replace(/\/$/, '') || '';

export const api = axios.create({
  baseURL: baseURL || undefined,
  timeout: 30000,
});

function authHeaderValue() {
  const token = getStoredToken();
  if (token == null || String(token).trim() === '') return null;
  if (getAuthHeaderMode() === 'bearer') {
    return token.toLowerCase().startsWith('bearer ')
      ? token
      : `Bearer ${token}`;
  }
  return token;
}

api.interceptors.request.use((config) => {
  const auth = authHeaderValue();
  if (auth) {
    config.headers.Authorization = auth;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (url.includes('/api/user/login')) {
      return Promise.reject(err);
    }
    if (err.response?.status === 401) {
      clearSession();
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

/**
 * POST /api/user/login — multipart/form-data (api_document.md)
 */
export async function loginWithCredentials(emailOrPhone, password) {
  const form = new FormData();
  form.append('email/phone', emailOrPhone);
  form.append('password', password);
  const { data } = await api.post('/api/user/login', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

const useDevicesApi = import.meta.env.VITE_USE_DEVICES_API !== 'false';

/**
 * GET /api/devices — requirement.md (trên MAIN_SERVER, có Authorization)
 */
export async function fetchDevicesFromServer() {
  if (!useDevicesApi || !baseURL) {
    return { skipped: true, data: [] };
  }
  const { data } = await api.get('/api/devices');
  return { skipped: false, data: Array.isArray(data) ? data : data?.devices ?? [] };
}

/**
 * GET /api/device/status/?serial= — api_document.md (tùy chọn, lấy IP gợi ý)
 */
export async function fetchDeviceStatusBySerial(serial) {
  if (!serial || !baseURL) return null;
  const { data } = await api.get('/api/device/status/', {
    params: { serial },
  });
  return data;
}
