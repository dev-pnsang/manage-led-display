import { t } from '../i18n';

function pickIpFromRaw(d) {
  if (!d || typeof d !== 'object') return null;
  const keys = [
    'ip',
    'IP',
    'device_ip',
    'deviceIp',
    'lan_ip',
    'lanIp',
    'ipv4',
    'ip_address',
    'ipAddress',
    'screen_ip',
    'screenIp',
    'screenIpAddress',
    'ip_screen',
    'host_ip',
    'hostIp',
  ];
  for (const k of keys) {
    const v = d[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function pickControlUrlFromRaw(d) {
  if (!d || typeof d !== 'object') return null;
  const keys = [
    'control_url',
    'controlUrl',
    'controlURL',
    'url',
    'web_url',
    'webUrl',
    'fpp_url',
    'fppUrl',
    'http_url',
    'panel_url',
    'panelUrl',
  ];
  for (const k of keys) {
    const v = d[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return null;
}

function normalizeSerial(raw) {
  if (raw == null) return undefined;
  const s = String(raw).trim();
  return s === '' ? undefined : s;
}

function normalizeServerEntry(d) {
  const ip = pickIpFromRaw(d);
  const explicitUrl = pickControlUrlFromRaw(d);
  return {
    id: String(d.id ?? ip ?? `dev_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`),
    name: d.name || d.hostname || d.device_name || d.deviceName || ip || t('device.genericName'),
    ip,
    control_url: explicitUrl || (ip ? `http://${ip}/` : null),
    online: d.online !== false,
    serial: normalizeSerial(d.serial ?? d.user_device_serial ?? d.userDeviceSerial),
    interface_count:
      d.interface_count != null && Number.isFinite(Number(d.interface_count))
        ? Number(d.interface_count)
        : undefined,
    interface_ips: Array.isArray(d.interface_ips) ? d.interface_ips : undefined,
  };
}

export function normalizeLoginDevice(d) {
  const ip = pickIpFromRaw(d);
  const explicitUrl = pickControlUrlFromRaw(d);
  return {
    id: String(d.id),
    name: d.name || `Screen ${d.id}`,
    ip,
    control_url: explicitUrl || (ip ? `http://${ip}/` : null),
    online: d.enabled !== false,
    serial: normalizeSerial(d.serial ?? d.user_device_serial ?? d.userDeviceSerial),
    interface_count:
      d.interface_count != null && Number.isFinite(Number(d.interface_count))
        ? Number(d.interface_count)
        : undefined,
    interface_ips: Array.isArray(d.interface_ips) ? d.interface_ips : undefined,
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
  const keyOf = (d) => d.id || d.serial || d.ip;
  const findExistingKey = (d) => {
    if (d.id && byKey.has(d.id)) return d.id;
    if (d.serial) {
      for (const [k, v] of byKey.entries()) {
        if (v?.serial && String(v.serial) === String(d.serial)) return k;
      }
    }
    if (d.ip) {
      for (const [k, v] of byKey.entries()) {
        if (v?.ip && String(v.ip) === String(d.ip)) return k;
      }
    }
    return null;
  };
  for (const d of primary) {
    byKey.set(keyOf(d), { ...d });
  }
  for (const d of extras) {
    const k = findExistingKey(d) || keyOf(d);
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
