import { useI18n } from '../i18n/I18nContext.jsx';

export default function LanguageSwitch({ className = '' }) {
  const { locale, setLocale, t } = useI18n();
  const base =
    'min-h-[36px] min-w-[40px] rounded-md px-2 text-xs font-semibold transition-colors';
  const active = 'bg-blue-600 text-white shadow-sm';
  const idle = 'text-gray-600 hover:bg-gray-100';

  return (
    <div
      className={`inline-flex items-center gap-0.5 rounded-lg border border-gray-200 bg-white p-0.5 ${className}`}
      role="group"
      aria-label={t('header.language')}
    >
      <button
        type="button"
        onClick={() => setLocale('vi')}
        className={`${base} ${locale === 'vi' ? active : idle}`}
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`${base} ${locale === 'en' ? active : idle}`}
      >
        EN
      </button>
    </div>
  );
}
