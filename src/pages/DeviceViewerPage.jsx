import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import IframeViewer from '../components/IframeViewer.jsx';
import LanguageSwitch from '../components/LanguageSwitch.jsx';
import { useDevices } from '../context/DevicesContext.jsx';
import { t } from '../i18n';
import { useI18n } from '../i18n/I18nContext.jsx';
import { getResolvedScanSubnets, invalidateScanSubnetCache } from '../services/localNetwork.js';
import { parseLegacyLanRouteId } from '../services/lanRegistry.js';
import { getDeviceDisplayName } from '../utils/deviceDisplay.js';
import { probeLanStatusReachable } from '../services/lanScan.js';
import { clearSession, getDisplayName, hasAuthSession } from '../services/storage';

export default function DeviceViewerPage() {
  const { t: tr } = useI18n();
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices, runLanScanSubnets, refresh } = useDevices();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const decodedId = id ? decodeURIComponent(id) : '';

  useEffect(() => {
    const legacyIp = parseLegacyLanRouteId(decodedId);
    if (!legacyIp) return;
    const match = devices.find((d) => d.ip === legacyIp);
    if (match) {
      navigate(`/viewer/${encodeURIComponent(match.id)}`, { replace: true });
    }
  }, [decodedId, devices, navigate]);

  const current = useMemo(
    () => devices.find((d) => String(d.id) === decodedId),
    [devices, decodedId]
  );

  useEffect(() => {
    if (!current?.ip) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (cancelled || !hasAuthSession()) return;
      const ok = await probeLanStatusReachable(current.ip);
      if (cancelled || !hasAuthSession() || ok) return;
      toast.error(t('viewer.toast.rescanning'));
      invalidateScanSubnetCache();
      try {
        const subnets = await getResolvedScanSubnets();
        if (!hasAuthSession() || cancelled) return;
        await runLanScanSubnets(subnets, { quiet: true });
        if (!hasAuthSession() || cancelled) return;
        await refresh();
      } catch {
        /* ignore */
      }
      if (cancelled || !hasAuthSession()) return;
      const recovered = await probeLanStatusReachable(current.ip);
      if (!hasAuthSession()) return;
      if (!recovered) {
        toast(t('viewer.toast.stillOffline'), { icon: 'ℹ️' });
        navigate('/', { replace: true });
      }
    }, 1000);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [current?.id, current?.ip, navigate, refresh, runLanScanSubnets]);

  const selectDevice = (d) => {
    if (!d.control_url) {
      toast.error(t('viewer.toast.noControlUrl'));
      return;
    }
    navigate(`/viewer/${encodeURIComponent(d.id)}`);
    setDrawerOpen(false);
  };

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  if (!current) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-4 py-3">
          <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
            {tr('viewer.backList')}
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-600">
          {tr('viewer.notFound')}{' '}
          <Link to="/" className="ml-1 text-blue-600">
            {tr('viewer.goBack')}
          </Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <aside className="flex w-full max-w-[200px] flex-col border-r border-gray-200 bg-white lg:max-w-[220px] lg:shrink-0">
      <div className="border-b border-gray-100 p-3">
        <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
          {tr('viewer.dashboard')}
        </Link>
        <p className="mt-2 truncate text-xs text-gray-500">{getDisplayName()}</p>
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
          {tr('viewer.devicesNav')}
        </p>
        <ul className="space-y-1">
          {devices.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                title={d.name}
                onClick={() => selectDevice(d)}
                className={`flex w-full min-h-[44px] items-center rounded-lg px-2 py-2 text-left text-sm ${
                  String(d.id) === decodedId
                    ? 'bg-blue-50 font-medium text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="line-clamp-2">{d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="space-y-2 border-t border-gray-100 p-2">
        <div className="flex justify-center py-1">
          <LanguageSwitch />
        </div>
        <button
          type="button"
          onClick={logout}
          className="w-full min-h-[44px] rounded-lg px-2 text-sm text-red-600 hover:bg-red-50"
        >
          {tr('header.logout')}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-gray-900 lg:flex-row">
      <div className="hidden min-h-0 lg:flex">{sidebar}</div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex shrink-0 items-center gap-2 border-b border-gray-800 bg-gray-950 px-2 py-1.5 text-white lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-gray-700 bg-gray-900"
            aria-label={tr('viewer.pickDevice')}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <LanguageSwitch className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{getDeviceDisplayName(current)}</p>
          </div>
          <Link
            to="/"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-sm text-blue-400"
          >
            {tr('viewer.list')}
          </Link>
        </div>

        <div className="relative min-h-0 flex-1 bg-black">
          <IframeViewer src={current.control_url} title={current.name} fullBleed />
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label={tr('viewer.close')}
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[75vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="font-semibold text-gray-900">{tr('viewer.pickDevice')}</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDevice(d)}
                  className={`mb-1 flex w-full min-h-[44px] items-center rounded-lg px-3 py-2 text-left text-sm ${
                    String(d.id) === decodedId ? 'bg-blue-50 font-medium text-blue-800' : 'hover:bg-gray-50'
                  }`}
                >
                  {getDeviceDisplayName(d)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
