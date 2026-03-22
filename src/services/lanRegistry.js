import { t } from '../i18n';

/**
 * Gán id công khai (UUID) cho thiết bị LAN — không lộ IP trong URL/UI.
 * IP + control_url chỉ lưu trong localStorage, map theo publicId.
 */

const REGISTRY_KEY = 'manage_led_lan_registry_v2';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `d_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function loadRaw() {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return { entries: {} };
    const data = JSON.parse(raw);
    return data?.entries ? data : { entries: {} };
  } catch {
    return { entries: {} };
  }
}

function saveRaw(data) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(data));
}

function buildByIp(entries) {
  const byIp = Object.create(null);
  for (const e of Object.values(entries)) {
    if (e?.ip) byIp[e.ip] = e.publicId;
  }
  return byIp;
}

function isUsableLanName(n, ip) {
  if (n == null) return false;
  const s = String(n).trim();
  if (!s) return false;
  if (ip && s === ip) return false;
  if (/^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})$/.test(s)) {
    return false;
  }
  return true;
}

function pickLanDisplayName(incomingName, prevName, ip) {
  if (isUsableLanName(incomingName, ip)) return String(incomingName).trim();
  if (isUsableLanName(prevName, ip)) return String(prevName).trim();
  return t('deviceCard.led');
}

/**
 * Đăng ký hoặc cập nhật theo IP — giữ nguyên publicId nếu IP đã có.
 * Không lưu/không trả về tên là địa chỉ IP (chỉ dùng nhãn chung).
 */
export function ensurePublicLanDevice({ ip, name, control_url }) {
  if (!ip || typeof ip !== 'string') return null;
  const data = loadRaw();
  const byIp = buildByIp(data.entries);
  let publicId = byIp[ip];
  if (!publicId) {
    publicId = newId();
  }
  const prev = data.entries[publicId] || {};
  const displayName = pickLanDisplayName(name, prev.name, ip);
  data.entries[publicId] = {
    publicId,
    ip,
    name: displayName,
    control_url: control_url || prev.control_url || `http://${ip}/`,
    updatedAt: Date.now(),
  };
  saveRaw(data);
  return {
    id: publicId,
    ip,
    name: displayName,
    control_url: data.entries[publicId].control_url,
    online: true,
    _lan: true,
  };
}

export function getLanRegistryEntryByPublicId(publicId) {
  if (!publicId) return null;
  const data = loadRaw();
  return data.entries[publicId] || null;
}

export function listLanRegistryEntries() {
  const data = loadRaw();
  return Object.values(data.entries);
}

export function clearLanRegistry() {
  localStorage.removeItem(REGISTRY_KEY);
}

const LEGACY_LAN_ID = /^lan_(\d{1,3}(?:\.\d{1,3}){3})$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Chuẩn hóa mảng thiết bị từ cache: legacy lan_IP -> UUID, đồng bộ registry */
export function migrateLanDevicesList(list) {
  if (!Array.isArray(list)) return { changed: false, list: [] };
  let changed = false;
  const out = list.map((d) => {
    if (!d || typeof d !== 'object') return d;
    const sid = String(d.id || '');
    const m = sid.match(LEGACY_LAN_ID);
    if (m) {
      const ip = m[1];
      changed = true;
      return ensurePublicLanDevice({
        ip,
        name: d.name,
        control_url: d.control_url || `http://${ip}/`,
      });
    }
    if (d.ip && !UUID_RE.test(sid)) {
      changed = true;
      return ensurePublicLanDevice({
        ip: d.ip,
        name: d.name,
        control_url: d.control_url,
      });
    }
    return d;
  });
  return { changed, list: out.filter(Boolean) };
}

/** Parse id route cũ dạng lan_x.x.x.x */
export function parseLegacyLanRouteId(routeId) {
  if (!routeId) return null;
  const m = String(decodeURIComponent(routeId)).match(LEGACY_LAN_ID);
  return m ? m[1] : null;
}
