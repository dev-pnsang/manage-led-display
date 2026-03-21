/**
 * Quét LAN theo api_document.md: GET http://<ip>/api/system/status
 * Trình duyệt chỉ gọi được nếu thiết bị bật CORS hoặc qua proxy.
 */

const MAX_CONCURRENT = 40;
const TIMEOUT_MS = 2000;

function hasValidStatusKeys(json) {
  if (!json || typeof json !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(json, 'current_song') ||
    Object.prototype.hasOwnProperty.call(json, 'status_name') ||
    Object.prototype.hasOwnProperty.call(json, 'time')
  );
}

export async function probeDeviceAtIp(ip) {
  const url = `http://${ip}/api/system/status`;
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      return null;
    }
    if (!hasValidStatusKeys(json)) return null;
    const name =
      json.hostname ||
      json.device_name ||
      json.name ||
      json.serial ||
      ip;
    return {
      id: `lan_${ip}`,
      name: String(name),
      ip,
      control_url: `http://${ip}/`,
      online: true,
      _source: 'lan',
    };
  } catch {
    clearTimeout(t);
    return null;
  }
}

async function runPool(hosts, worker, concurrency) {
  const results = [];
  let index = 0;
  async function runWorker() {
    while (index < hosts.length) {
      const cur = index;
      index += 1;
      const out = await worker(hosts[cur]);
      if (out) results.push(out);
    }
  }
  const n = Math.min(concurrency, Math.max(1, hosts.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

/**
 * @param {string} subnetPrefix ví dụ "192.168.1" (không có dấu chấm cuối)
 */
export async function scanSubnet(subnetPrefix) {
  const base = subnetPrefix.replace(/\.$/, '').trim();
  if (!/^\d{1,3}(\.\d{1,3}){2}$/.test(base)) {
    throw new Error('Subnet không hợp lệ. Dùng dạng 192.168.1');
  }
  const hosts = [];
  for (let h = 1; h <= 254; h += 1) {
    hosts.push(`${base}.${h}`);
  }
  return runPool(hosts, probeDeviceAtIp, MAX_CONCURRENT);
}
