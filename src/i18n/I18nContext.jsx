import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getLocale, setLocaleStorage, t as tFn } from './index.js';

const I18nContext = createContext(null);

function applyDocumentLang(v) {
  try {
    document.documentElement.lang = v === 'en' ? 'en' : 'vi';
  } catch {
    /* ignore */
  }
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(() => getLocale());

  useEffect(() => {
    applyDocumentLang(locale);
    try {
      document.title = tFn('app.title');
    } catch {
      /* ignore */
    }
  }, [locale]);

  const setLocale = useCallback((next) => {
    const v = setLocaleStorage(next);
    setLocaleState(v);
  }, []);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t: (key, vars) => tFn(key, vars),
    }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
