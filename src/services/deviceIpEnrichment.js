/**
 * Bổ sung luồng lấy IP theo serial từ backend, sau đó probe IP thật trong LAN.
 * Ưu tiên IP backend trả về trước (advancedView.IPs).
 */
import { fetchDeviceStatusBySerial } from './api.js';
import { probeDeviceAtIp } from './lanScan.js';

function extractCandidateIpsFromDeviceStatus(raw) {
  if (!raw || typeof raw !== 'object') return [];
  const root = raw.data && typeof raw.data === 'object' ? raw.data : raw;
  const ips = root?.advancedView?.IPs;
  if (!Array.isArray(ips)) return [];
  return [
    ...new Set(
      ips
        .map((x) => (x == null ? '' : String(x).trim()))
        .filter(Boolean)
        .filter((x) => /^\d{1,3}(\.\d{1,3}){3}$/.test(x))
    ),
  ];
}

async function resolveWorkingIpFromBackendSerial(serial) {
  const status = await fetchDeviceStatusBySerial(serial);
  const ips = extractCandidateIpsFromDeviceStatus(status);
  for (const ip of ips) {
    const probed = await probeDeviceAtIp(ip);
    if (probed) return probed;
  }
  return null;
}

export async function enrichDeviceWithSerialStatusLookup(device) {
  if (!device || typeof device !== 'object') return device;

  const hasUrl = device.control_url && String(device.control_url).trim();
  const ip = device.ip != null ? String(device.ip).trim() : '';
  if (hasUrl && ip) return device;

  // 1) Nếu đã có IP nhưng chưa có control_url → chuẩn hóa ngay.
  if (!hasUrl && ip) {
    return {
      ...device,
      control_url: `http://${ip}/`,
    };
  }

  // 2) Nếu chưa có IP/URL nhưng có serial → hỏi backend lấy danh sách IP, probe để chọn IP hợp lệ.
  const serial = device.serial != null ? String(device.serial).trim() : '';
  if (!serial) return device;

  const probed = await resolveWorkingIpFromBackendSerial(serial);
  if (!probed?.ip) return device;

  return {
    ...device,
    ip: probed.ip,
    control_url: probed.control_url || `http://${probed.ip}/`,
    online: true,
    interface_ips: probed.interface_ips,
    interface_count: probed.interface_count,
    _source: device._source || 'server_ip',
  };
}

export async function enrichDevicesMissingControlUrl(devices) {
  if (!Array.isArray(devices) || devices.length === 0) return devices;

  // Giới hạn đồng thời để tránh spam backend + LAN probe.
  const MAX_CONCURRENT = 5;
  const queue = [...devices];
  const out = [];

  async function worker() {
    while (queue.length > 0) {
      const d = queue.shift();
      if (!d) continue;
      try {
        out.push(await enrichDeviceWithSerialStatusLookup(d));
      } catch {
        out.push(d);
      }
    }
  }

  const n = Math.min(MAX_CONCURRENT, Math.max(1, devices.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return out;
}
