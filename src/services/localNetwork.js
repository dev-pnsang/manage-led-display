/**
 * Phát hiện subnet LAN IPv4 /24 từ máy đang chạy trình duyệt.
 * Trình duyệt không có API đọc IP trực tiếp; dùng WebRTC ICE (ứng viên host/srflx) để suy ra dải mạng.
 */

const DEFAULT_FALLBACK_SUBNETS = [
  '192.168.1',
  '192.168.0',
  '192.168.137',
  '192.168.43',
  '10.0.0',
  '10.0.1',
  '10.1.1',
  '172.16.0',
  '172.20.10',
  '169.254.1',
];

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map((x) => Number(x));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  return false;
}

function isValidSubnetPrefix(prefix) {
  if (!/^\d{1,3}(\.\d{1,3}){2}$/.test(prefix)) return false;
  const parts = prefix.split('.').map((x) => Number(x));
  if (parts.length !== 3) return false;
  return parts.every((n) => Number.isInteger(n) && n >= 0 && n <= 255);
}

function extractIPv4sFromCandidate(candidateStr) {
  if (!candidateStr || typeof candidateStr !== 'string') return [];
  const re =
    /\b(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})\b/g;
  const out = [];
  let m;
  while ((m = re.exec(candidateStr)) !== null) {
    out.push(m[0]);
  }
  return out;
}

/**
 * @param {{ timeoutMs?: number }} opts
 * @returns {Promise<string[]>} danh sách tiền tố /24 duy nhất, ví dụ ["192.168.1", "10.0.0"]
 */
export function discoverLocalSubnetsViaWebRTC({ timeoutMs = 4500 } = {}) {
  return new Promise((resolve) => {
    if (typeof RTCPeerConnection === 'undefined') {
      resolve([]);
      return;
    }

    const subnets = new Set();
    const ipsSeen = new Set();
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        pc.close();
      } catch {
        /* ignore */
      }
      resolve([...subnets]);
    };

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    const timer = setTimeout(finish, timeoutMs);

    const ingest = (candidateStr) => {
      for (const ip of extractIPv4sFromCandidate(candidateStr)) {
        if (ipsSeen.has(ip)) continue;
        if (!isPrivateIPv4(ip)) continue;
        ipsSeen.add(ip);
        subnets.add(ip.split('.').slice(0, 3).join('.'));
      }
    };

    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        ingest(ev.candidate.candidate);
      } else {
        finish();
      }
    };

    pc.onicegatheringstatechange = () => {
      if (pc.iceGatheringState === 'complete') {
        finish();
      }
    };

    try {
      pc.createDataChannel('lan-probe');
      pc
        .createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .catch(() => finish());
    } catch {
      finish();
    }
  });
}

function parseEnvSubnets() {
  const raw =
    import.meta.env.VITE_AUTO_SCAN_SUBNETS ||
    import.meta.env.VITE_DEFAULT_LAN_SUBNET ||
    DEFAULT_FALLBACK_SUBNETS.join(',');
  return normalizeSubnetPrefixes(raw);
}

export function normalizeSubnetPrefixes(input) {
  const chunks = Array.isArray(input) ? input : [input];
  const out = [];
  const seen = new Set();
  for (const chunk of chunks) {
    const parts = String(chunk ?? '')
      .split(/[\s,;\n]+/)
      .map((x) => x.replace(/\.$/, '').trim())
      .filter(Boolean);
    for (const prefix of parts) {
      if (!isValidSubnetPrefix(prefix) || seen.has(prefix)) continue;
      seen.add(prefix);
      out.push(prefix);
    }
  }
  return out;
}

/**
 * Ưu tiên subnet suy ra từ IP cục bộ (WebRTC); không được thì dùng biến môi trường / mặc định.
 */
export async function resolveScanSubnets() {
  const detected = await discoverLocalSubnetsViaWebRTC();
  if (detected.length > 0) {
    return [...new Set(detected)].sort();
  }
  return parseEnvSubnets();
}

let cachedSubnetsPromise = null;

/** Một lần mỗi “vòng đời” (invalidate khi đăng xuất) để tránh gọi WebRTC lặp. */
export function getResolvedScanSubnets() {
  cachedSubnetsPromise = cachedSubnetsPromise ?? resolveScanSubnets();
  return cachedSubnetsPromise;
}

export function invalidateScanSubnetCache() {
  cachedSubnetsPromise = null;
}
