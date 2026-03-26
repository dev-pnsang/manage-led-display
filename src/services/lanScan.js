/**
 * Quét LAN theo api_document.md: GET http://<ip>/api/system/status
 * Trình duyệt chỉ gọi được nếu thiết bị bật CORS hoặc qua proxy.
 */

const MAX_CONCURRENT = 40;
const IPV4_RE =
  /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g;

function probeTimeoutMs() {
  const n = Number(import.meta.env.VITE_LAN_PROBE_TIMEOUT_MS);
  // Thiết bị có thể lag nên mặc định cao hơn; vẫn cho phép cấu hình qua env.
  return Number.isFinite(n) && n >= 500 && n <= 60000 ? n : 15000;
}

function hasValidStatusKeys(json) {
  if (!json || typeof json !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(json, 'current_song') ||
    Object.prototype.hasOwnProperty.call(json, 'status_name') ||
    Object.prototype.hasOwnProperty.call(json, 'time')
  );
}

function extractInterfaceIpsFromStatus(json) {
  if (!json || typeof json !== 'object') return [];
  const out = [];
  const seen = new Set();
  const push = (x) => {
    if (typeof x !== 'string') return;
    const s = x.trim();
    if (!s) return;
    const hits = s.match(IPV4_RE) || [];
    for (const ip of hits) {
      if (seen.has(ip)) continue;
      seen.add(ip);
      out.push(ip);
    }
  };

  for (const key of ['ip', 'IP', 'lan_ip', 'host_ip']) {
    push(json[key]);
  }
  const candidates = [json.IPs, json.ips, json.ip_list, json.ipList, json.interfaces];
  for (const value of candidates) {
    if (!value) continue;
    if (Array.isArray(value)) {
      for (const x of value) {
        if (typeof x === 'string') push(x);
        else if (x && typeof x === 'object') push(x.ip || x.IP || x.address);
      }
    } else if (typeof value === 'string') {
      push(value);
    }
  }

  return out;
}

export async function probeDeviceAtIp(ip) {
  const url = `http://${ip}/api/system/status`;
  const controller = new AbortController();
  const ms = probeTimeoutMs();
  const t = setTimeout(() => controller.abort(), ms);
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
      json.host_name ||
      json.hostname ||
      json.device_name ||
      json.name ||
      json.advancedView?.HostName ||
      json.serial ||
      ip;
    const interfaceIps = extractInterfaceIpsFromStatus(json);
    return {
      id: `lan_${ip}`,
      name: String(name),
      ip,
      control_url: `http://${ip}/`,
      online: true,
      serial: json.serial != null ? String(json.serial).trim() || undefined : undefined,
      interface_ips: interfaceIps,
      interface_count: interfaceIps.length || undefined,
      _source: 'lan',
    };
  } catch {
    clearTimeout(t);
    return null;
  }
}

/**
 * Hàng đợi + shift: mỗi host chỉ được gán đúng một worker, không trùng không sót.
 * Thứ tự *hoàn thành* request vẫn không theo 1,2,3… vì chạy song song.
 */
async function runPool(hosts, workerFn, concurrency, shouldContinue) {
  const results = [];
  const queue = [...hosts];
  async function runWorker() {
    while (queue.length > 0) {
      if (shouldContinue && !shouldContinue()) {
        queue.length = 0;
        break;
      }
      const host = queue.shift();
      if (host == null) break;
      try {
        const out = await workerFn(host);
        if (out) results.push(out);
      } catch {
        /* probeDeviceAtIp không ném lỗi; giữ an toàn */
      }
      if (shouldContinue && !shouldContinue()) {
        queue.length = 0;
        break;
      }
    }
  }
  const n = Math.min(concurrency, Math.max(1, hosts.length));
  await Promise.all(Array.from({ length: n }, () => runWorker()));
  return results;
}

/**
 * @param {string} subnetPrefix ví dụ "192.168.1" (không có dấu chấm cuối)
 */
/** Kiểm tra thiết bị còn phản hồi /api/system/status (không parse JSON kỹ). */
export async function probeLanStatusReachable(ip) {
  const url = `http://${ip}/api/system/status`;
  const controller = new AbortController();
  const ms = probeTimeoutMs();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      mode: 'cors',
    });
    clearTimeout(t);
    return res.ok;
  } catch {
    clearTimeout(t);
    return false;
  }
}

/**
 * @param {string} subnetPrefix
 * @param {{ shouldContinue?: () => boolean }} [options] — trả false để dừng quét (vd. đã đăng xuất)
 */
export async function scanSubnet(subnetPrefix, options = {}) {
  const { shouldContinue } = options;
  const base = subnetPrefix.replace(/\.$/, '').trim();
  if (!/^\d{1,3}(\.\d{1,3}){2}$/.test(base)) {
    throw new Error('Subnet không hợp lệ. Dùng dạng 192.168.1');
  }
  const hosts = [];
  for (let h = 1; h <= 254; h += 1) {
    hosts.push(`${base}.${h}`);
  }
  return runPool(hosts, probeDeviceAtIp, MAX_CONCURRENT, shouldContinue);
}
