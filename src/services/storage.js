const KEYS = {
  AUTH_TOKEN: 'user_server_api_key',
  AUTH_HEADER_MODE: 'auth_header_mode',
  USER_DATA: 'user_data',
  USER_NAME: 'user_name',
  LAN_DEVICES: 'lan_devices_cache',
};

export function getStoredToken() {
  return localStorage.getItem(KEYS.AUTH_TOKEN);
}

/** 'bearer' | 'raw' */
export function getAuthHeaderMode() {
  return localStorage.getItem(KEYS.AUTH_HEADER_MODE) || 'raw';
}

export function setSessionFromLogin(responseData) {
  const { api_key, api_key_prefix, name } = responseData;
  if (api_key) {
    localStorage.setItem(KEYS.AUTH_TOKEN, api_key);
  }
  const prefix = (api_key_prefix || '').toLowerCase();
  localStorage.setItem(
    KEYS.AUTH_HEADER_MODE,
    prefix === 'bearer' ? 'bearer' : 'raw'
  );
  localStorage.setItem(KEYS.USER_DATA, JSON.stringify(responseData));
  if (name) localStorage.setItem(KEYS.USER_NAME, name);
}

export function clearSession() {
  localStorage.removeItem(KEYS.AUTH_TOKEN);
  localStorage.removeItem(KEYS.AUTH_HEADER_MODE);
  localStorage.removeItem(KEYS.USER_DATA);
  localStorage.removeItem(KEYS.USER_NAME);
  localStorage.removeItem(KEYS.LAN_DEVICES);
}

export function getUserData() {
  try {
    const raw = localStorage.getItem(KEYS.USER_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getDisplayName() {
  return localStorage.getItem(KEYS.USER_NAME) || 'User';
}

export function getLanDevicesCache() {
  try {
    const raw = localStorage.getItem(KEYS.LAN_DEVICES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function setLanDevicesCache(devices) {
  localStorage.setItem(KEYS.LAN_DEVICES, JSON.stringify(devices));
}
