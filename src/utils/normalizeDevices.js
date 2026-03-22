import { t } from '../i18n';

function normalizeServerEntry(d) {
  const ip = d.ip || d.IP || null;
  return {
    id: String(d.id ?? ip ?? `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    name: d.name || d.hostname || ip || t('device.genericName'),
    ip,
    control_url:
      d.control_url ||
      (ip ? `http://${ip}/` : null),
    online: d.online !== false,
    serial: d.serial,
  };
}

export function normalizeLoginDevice(d) {
  const ip = d.ip || null;
  return {
    id: String(d.id),
    name: d.name || `Screen ${d.id}`,
    ip,
    control_url: d.control_url || (ip ? `http://${ip}/` : null),
    online: d.enabled !== false,
    serial: d.serial,
  };
}

export function devicesFromLoginUser(userData) {
  const list = userData?.devices;
  if (!Array.isArray(list)) return [];
  return list.map(normalizeLoginDevice);
}

/**
 * Gộp danh sách: ưu tiên theo id, sau đó theo ip
 */
export function mergeDeviceLists(primary, extras) {
  const byKey = new Map();
  const keyOf = (d) => d.id || d.ip;
  for (const d of primary) {
    byKey.set(keyOf(d), { ...d });
  }
  for (const d of extras) {
    const k = keyOf(d);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, { ...d });
    } else {
      byKey.set(k, {
        ...prev,
        ...d,
        control_url: d.control_url || prev.control_url,
        ip: d.ip || prev.ip,
      });
    }
  }
  return Array.from(byKey.values());
}

export function normalizeDevicesApiResponse(data) {
  if (!Array.isArray(data)) return [];
  return data.map(normalizeServerEntry);
}
