import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import LanguageSwitch from '../components/LanguageSwitch.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import { loginWithCredentials } from '../services/api';
import {
  setSessionFromLogin,
  hasAuthSession,
  getRememberedLoginId,
} from '../services/storage';

export default function LoginPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [emailOrPhone, setEmailOrPhone] = useState(() => getRememberedLoginId());
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (hasAuthSession()) navigate(from, { replace: true });
  }, [from, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!emailOrPhone.trim() || !password) {
      toast.error(t('login.error.credentials'));
      return;
    }
    setSubmitting(true);
    try {
      const data = await loginWithCredentials(emailOrPhone.trim(), password);
      const saved = setSessionFromLogin(data, { remember: rememberMe });
      if (!saved.ok) {
        toast.error(saved.message);
        return;
      }
      toast.success(t('login.success'));
      navigate(from, { replace: true });
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      const msg =
        serverMsg ||
        (err.response?.status === 401 || err.response?.status === 403
          ? t('login.error.auth')
          : err.message || t('login.error.generic'));
      toast.error(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="absolute right-4 top-4 z-10">
        <LanguageSwitch />
      </div>
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-md sm:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl">
            <img
              src="/assets/images/logo/GOADS_logo_icon.png"
              alt=""
              width={56}
              height={56}
              className="h-14 w-14 object-contain"
            />
          </div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('app.title')}</h1>
          <p className="mt-2 text-sm text-gray-500">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email-phone" className="mb-1 block text-sm font-medium text-gray-700">
              {t('login.emailLabel')}
            </label>
            <input
              id="email-phone"
              type="text"
              autoComplete="username"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              placeholder="ledscreen@goads.vn"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
              {t('login.passwordLabel')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-[44px] w-full rounded-lg border border-gray-300 py-2 pl-3 pr-12 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                aria-label={showPassword ? t('login.showPassword.hide') : t('login.showPassword.show')}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                    />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span>{t('login.remember')}</span>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-[44px] w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
          >
            {submitting ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
