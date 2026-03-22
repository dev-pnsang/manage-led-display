/**
 * Phát hiện subnet LAN IPv4 /24 từ máy đang chạy trình duyệt.
 * Trình duyệt không có API đọc IP trực tiếp; dùng WebRTC ICE (ứng viên host/srflx) để suy ra dải mạng.
 */

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
    '192.168.1';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
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
