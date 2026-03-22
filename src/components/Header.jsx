import { Link } from 'react-router-dom';
import LanguageSwitch from './LanguageSwitch.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export default function Header({ displayName, onLogout }) {
  const { t } = useI18n();
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <img
            src="/assets/images/logo/GOADS_logo_icon.png"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-lg object-contain"
          />
          <span className="hidden max-w-[11rem] truncate text-base font-semibold text-gray-900 sm:inline md:max-w-md md:text-lg lg:max-w-none">
            {t('app.title')}
          </span>
        </Link>

        <div className="flex items-center gap-2 md:gap-4">
          <p className="hidden text-sm text-gray-600 md:block">
            {t('header.greeting')}{' '}
            <span className="font-medium text-gray-900">{displayName}</span>
          </p>
          <LanguageSwitch className="shrink-0" />
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full bg-gray-100 text-gray-600 md:hidden"
            aria-hidden
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </span>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 md:min-w-0 md:px-4"
          >
            <svg className="h-5 w-5 md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden md:inline">{t('header.logout')}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
