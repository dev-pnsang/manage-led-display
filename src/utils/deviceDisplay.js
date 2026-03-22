import { t } from '../i18n';

const IPV4_RE =
  /^(?:(?:25[0-5]|2[0-4]\d|1?\d{1,2})\.){3}(?:25[0-5]|2[0-4]\d|1?\d{1,2})$/;

export function looksLikeIPv4(s) {
  return typeof s === 'string' && IPV4_RE.test(s.trim());
}

/** Không hiển thị địa chỉ IP như tên thiết bị. */
export function getDeviceDisplayName(device) {
  if (!device) return t('device.genericName');
  const raw = String(device.name ?? '').trim();
  if (!raw || looksLikeIPv4(raw)) {
    const ser = device.serial != null ? String(device.serial).trim() : '';
    if (ser && !looksLikeIPv4(ser)) return ser;
    return t('deviceCard.led');
  }
  return raw;
}
