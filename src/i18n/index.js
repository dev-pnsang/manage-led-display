import { messages } from './messages.js';

export const LOCALE_STORAGE_KEY = 'manage_led_locale';

export function getLocale() {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'vi';
  } catch {
    return 'vi';
  }
}

export function setLocaleStorage(locale) {
  const next = locale === 'en' ? 'en' : 'vi';
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  return next;
}

function interpolate(str, vars) {
  if (!vars || typeof str !== 'string') return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, k) =>
    vars[k] != null ? String(vars[k]) : ''
  );
}

/** Dùng được cả trong service (toast): đọc locale từ localStorage mỗi lần gọi. */
export function t(key, vars) {
  const loc = getLocale();
  const table = messages[loc] || messages.vi;
  const fallback = messages.vi[key];
  const raw = table[key] ?? fallback ?? key;
  return interpolate(raw, vars);
}
