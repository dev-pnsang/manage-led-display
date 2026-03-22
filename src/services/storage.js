import { invalidateScanSubnetCache } from './localNetwork.js';
import { t } from '../i18n';
import {
  clearLanRegistry,
  migrateLanDevicesList,
  ensurePublicLanDevice,
} from './lanRegistry.js';

const REMEMBERED_LOGIN_ID = 'manage_led_remember_login_id';
const REMEMBERED_DEVICE_IPS = 'manage_led_remember_device_ips';

const KEYS = {
  AUTH_TOKEN: 'user_server_api_key',
  /** Khi api_key null nhưng login 200 có id — vẫn coi là đã đăng nhập (chỉ gọi API có Bearer khi có token). */
  AUTH_USER_ID: 'auth_user_id',
  AUTH_HEADER_MODE: 'auth_header_mode',
  USER_DATA: 'user_data',
  USER_NAME: 'user_name',
  LAN_DEVICES: 'lan_devices_cache',
};

const PERSIST_FLAG = 'auth_session_mode';

const AUTH_KEY_LIST = [
  KEYS.AUTH_TOKEN,
  KEYS.AUTH_USER_ID,
  KEYS.AUTH_HEADER_MODE,
  KEYS.USER_DATA,
  KEYS.USER_NAME,
];

function clearAuthKeysFrom(store) {
  AUTH_KEY_LIST.forEach((k) => store.removeItem(k));
}

/**
 * Một số backend trả { data: { api_key, ... } } hoặc dùng camelCase / token.
 */
export function normalizeLoginPayload(raw) {
  if (raw == null || typeof raw !== 'object') return null;

  let root = { ...raw };

  if (raw.data != null && typeof raw.data === 'object') {
    const inner = raw.data;
    const innerHasAuth =
      inner.api_key != null ||
      inner.apiKey != null ||
      inner.token != null ||
      inner.access_token != null;
    if (innerHasAuth || Object.keys(inner).length > 0) {
      root = { ...raw, ...inner };
    }
  }

  if (root.user != null && typeof root.user === 'object') {
    const u = root.user;
    root = {
      ...root,
      ...u,
      devices: root.devices ?? u.devices,
    };
  }

  const api_key =
    root.api_key ??
    root.apiKey ??
    root.token ??
    root.access_token ??
    root.accessToken ??
    null;

  const api_key_prefix =
    root.api_key_prefix ?? root.apiKeyPrefix ?? root.token_type;

  const name =
    root.name ?? root.username ?? root.full_name ?? root.display_name;

  return {
    ...root,
    api_key,
    api_key_prefix,
    name,
  };
}

function getSessionStore() {
  const mode = localStorage.getItem(PERSIST_FLAG);
  if (mode === 'session') return sessionStorage;
  if (mode === 'local') return localStorage;
  if (
    localStorage.getItem(KEYS.AUTH_TOKEN) ||
    localStorage.getItem(KEYS.AUTH_USER_ID)
  ) {
    return localStorage;
  }
  if (
    sessionStorage.getItem(KEYS.AUTH_TOKEN) ||
    sessionStorage.getItem(KEYS.AUTH_USER_ID)
  ) {
    return sessionStorage;
  }
  return localStorage;
}

export function getStoredToken() {
  const mode = localStorage.getItem(PERSIST_FLAG);
  if (mode === 'session') return sessionStorage.getItem(KEYS.AUTH_TOKEN);
  if (mode === 'local') return localStorage.getItem(KEYS.AUTH_TOKEN);
  return (
    localStorage.getItem(KEYS.AUTH_TOKEN) ||
    sessionStorage.getItem(KEYS.AUTH_TOKEN)
  );
}

/** Có phiên hợp lệ: có api_key hoặc backend trả user id (api_key tắt). */
export function hasAuthSession() {
  const token = getStoredToken();
  if (token != null && String(token).trim() !== '') return true;
  const mode = localStorage.getItem(PERSIST_FLAG);
  if (mode === 'session') {
    return !!sessionStorage.getItem(KEYS.AUTH_USER_ID);
  }
  if (mode === 'local') {
    return !!localStorage.getItem(KEYS.AUTH_USER_ID);
  }
  return !!(
    localStorage.getItem(KEYS.AUTH_USER_ID) ||
    sessionStorage.getItem(KEYS.AUTH_USER_ID)
  );
}

/** 'bearer' | 'raw' */
export function getAuthHeaderMode() {
  const store = getSessionStore();
  return store.getItem(KEYS.AUTH_HEADER_MODE) || 'raw';
}

/**
 * @param {object} responseData — body JSON từ POST /api/user/login
 * @param {{ remember?: boolean }} options — remember: true = localStorage, false (mặc định) = sessionStorage
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function setSessionFromLogin(responseData, { remember = false } = {}) {
  const normalized = normalizeLoginPayload(responseData);
  if (!normalized) {
    return { ok: false, message: t('storage.loginInvalid') };
  }

  const apiKeyRaw = normalized.api_key;
  const hasApiKey =
    apiKeyRaw != null &&
    String(apiKeyRaw).trim() !== '' &&
    String(apiKeyRaw).toLowerCase() !== 'null';

  const userId =
    normalized.id != null && String(normalized.id).trim() !== ''
      ? String(normalized.id)
      : null;

  if (!hasApiKey && !userId) {
    return {
      ok: false,
      message: t('storage.loginNoSession'),
    };
  }

  clearAuthKeysFrom(localStorage);
  clearAuthKeysFrom(sessionStorage);

  localStorage.setItem(PERSIST_FLAG, remember ? 'local' : 'session');

  const store = remember ? localStorage : sessionStorage;

  if (hasApiKey) {
    store.setItem(KEYS.AUTH_TOKEN, String(apiKeyRaw).trim());
    const prefix = String(normalized.api_key_prefix || '').toLowerCase();
    store.setItem(
      KEYS.AUTH_HEADER_MODE,
      prefix === 'bearer' ? 'bearer' : 'raw'
    );
  } else {
    store.setItem(KEYS.AUTH_HEADER_MODE, 'raw');
    store.setItem(KEYS.AUTH_USER_ID, userId);
  }

  store.setItem(KEYS.USER_DATA, JSON.stringify(normalized));
  if (normalized.name) {
    store.setItem(KEYS.USER_NAME, normalized.name);
  }

  return { ok: true };
}

/** Xóa khi logout để lần đăng nhập sau quét LAN tự động lại. */
export const SESSION_AUTO_LAN_SCAN_KEY = 'manage-led-auto-lan-once';

function peekUserLoginIdentifier(userData) {
  if (!userData || typeof userData !== 'object') return '';
  const u = userData;
  return String(u.email || u.phone || u.username || u.name || '').trim();
}

function peekUserDeviceIps(userData) {
  const list = userData?.devices;
  if (!Array.isArray(list)) return [];
  const ips = [];
  for (const d of list) {
    if (d?.ip && typeof d.ip === 'string') {
      const ip = d.ip.trim();
      if (ip) ips.push(ip);
    }
  }
  return [...new Set(ips)];
}

/** Email/SĐT đã lưu khi logout (điền lại form đăng nhập). */
export function getRememberedLoginId() {
  try {
    return localStorage.getItem(REMEMBERED_LOGIN_ID) || '';
  } catch {
    return '';
  }
}

/** Danh sách IP thiết bị kèm tài khoản (lưu khi logout). */
export function getRememberedDeviceIps() {
  try {
    const raw = localStorage.getItem(REMEMBERED_DEVICE_IPS);
    const a = raw ? JSON.parse(raw) : [];
    return Array.isArray(a) ? a.filter((x) => typeof x === 'string' && x.trim()) : [];
  } catch {
    return [];
  }
}

export function clearSession() {
  try {
    const u = getUserData();
    if (u) {
      const id = peekUserLoginIdentifier(u);
      const ips = peekUserDeviceIps(u);
      if (id) localStorage.setItem(REMEMBERED_LOGIN_ID, id);
      localStorage.setItem(REMEMBERED_DEVICE_IPS, JSON.stringify(ips));
    }
  } catch {
    /* ignore */
  }

  clearAuthKeysFrom(localStorage);
  clearAuthKeysFrom(sessionStorage);
  localStorage.removeItem(PERSIST_FLAG);
  localStorage.removeItem(KEYS.LAN_DEVICES);
  sessionStorage.removeItem(SESSION_AUTO_LAN_SCAN_KEY);
  invalidateScanSubnetCache();
  clearLanRegistry();
}

export function getUserData() {
  try {
    const store = getSessionStore();
    const raw = store.getItem(KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getDisplayName() {
  const store = getSessionStore();
  return store.getItem(KEYS.USER_NAME) || 'User';
}

export function getLanDevicesCache() {
  try {
    const raw = localStorage.getItem(KEYS.LAN_DEVICES);
    if (!raw) return [];
    const list = JSON.parse(raw);
    const { changed, list: migrated } = migrateLanDevicesList(list);
    const next = migrated.map((d) =>
      d?.ip
        ? ensurePublicLanDevice({
            ip: d.ip,
            name: d.name,
            control_url: d.control_url,
          })
        : d
    );
    const rowSig = (d) =>
      d && typeof d === 'object'
        ? `${d.id}|${d.ip}|${d.name}|${d.control_url}`
        : '';
    let needsWrite = changed;
    if (!needsWrite && migrated.length === next.length) {
      for (let i = 0; i < migrated.length; i += 1) {
        if (rowSig(migrated[i]) !== rowSig(next[i])) {
          needsWrite = true;
          break;
        }
      }
    }
    if (needsWrite) {
      localStorage.setItem(KEYS.LAN_DEVICES, JSON.stringify(next.filter(Boolean)));
    }
    return next.filter(Boolean);
  } catch {
    return [];
  }
}

/** Chuẩn hóa id UUID + registry; gộp trùng IP. */
export function setLanDevicesCache(devices) {
  const byId = new Map();
  for (const d of devices || []) {
    if (d?.ip) {
      const e = ensurePublicLanDevice({
        ip: d.ip,
        name: d.name,
        control_url: d.control_url,
      });
      if (e) byId.set(e.id, e);
    } else if (d?.id != null) {
      byId.set(String(d.id), d);
    }
  }
  localStorage.setItem(KEYS.LAN_DEVICES, JSON.stringify([...byId.values()]));
}
