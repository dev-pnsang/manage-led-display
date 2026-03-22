import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DeviceList from '../components/DeviceList.jsx';
import { useDevices } from '../context/DevicesContext.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';
import {
  getResolvedScanSubnets,
  invalidateScanSubnetCache,
} from '../services/localNetwork.js';
import { clearSession, getDisplayName, hasAuthSession } from '../services/storage';

export default function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const {
    devices,
    loading,
    scanning,
    lastUpdated,
    initialDiscoveryComplete,
    refresh,
    runLanScanSubnets,
  } = useDevices();

  useEffect(() => {
    if (!initialDiscoveryComplete || loading) return;
    if (devices.length === 1 && devices[0].control_url) {
      navigate(`/viewer/${encodeURIComponent(devices[0].id)}`, { replace: true });
    }
  }, [initialDiscoveryComplete, loading, devices, navigate]);

  const handleLanScan = useCallback(async () => {
    if (!hasAuthSession()) return;
    invalidateScanSubnetCache();
    const subnets = await getResolvedScanSubnets();
    if (!hasAuthSession()) return;
    await runLanScanSubnets(subnets, { quiet: false });
  }, [runLanScanSubnets]);

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const formatTime = () => {
    if (!lastUpdated) return '—';
    return lastUpdated.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={getDisplayName()} onLogout={logout} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="mb-6 rounded-lg border border-gray-100 bg-white p-4 shadow-md md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.devices')}</h2>
              <p className="text-sm text-gray-500">
                {t('dashboard.updated')} {formatTime()}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => void handleLanScan()}
                disabled={scanning}
                className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {scanning ? t('dashboard.searching') : t('dashboard.searchDevices')}
              </button>
              <button
                type="button"
                onClick={() => refresh()}
                className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t('dashboard.refresh')}
              </button>
            </div>
          </div>
        </section>

        <DeviceList
          devices={devices}
          loading={loading}
          onRescan={() => void handleLanScan()}
        />
      </main>
    </div>
  );
}
