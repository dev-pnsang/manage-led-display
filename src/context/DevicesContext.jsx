import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import toast from 'react-hot-toast';
import { fetchDevicesFromServer } from '../services/api';
import { enrichDevicesMissingControlUrl } from '../services/deviceIpEnrichment.js';
import { t } from '../i18n';
import {
  getLanDevicesCache,
  getUserData,
  hasAuthSession,
  setLanDevicesCache,
} from '../services/storage';
import { scanSubnet } from '../services/lanScan';
import {
  devicesFromLoginUser,
  mergeDeviceLists,
  normalizeDevicesApiResponse,
} from '../utils/normalizeDevices';

const DevicesContext = createContext(null);

const POLL_MS = 15000;

export function DevicesProvider({ children }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [initialDiscoveryComplete, setInitialDiscoveryComplete] = useState(false);

  const buildMergedList = useCallback(async () => {
    if (!hasAuthSession()) return;

    const user = getUserData();
    const fromLogin = devicesFromLoginUser(user);
    const lanCached = getLanDevicesCache();

    let fromApi = [];
    try {
      const { skipped, data } = await fetchDevicesFromServer();
      if (!hasAuthSession()) return;
      if (!skipped && Array.isArray(data) && data.length > 0) {
        fromApi = normalizeDevicesApiResponse(data);
      }
    } catch {
      /* Backend có thể chưa có GET /api/devices */
    }

    if (!hasAuthSession()) return;

    const base =
      fromApi.length > 0
        ? mergeDeviceLists(fromApi, lanCached)
        : mergeDeviceLists(fromLogin, lanCached);

    if (!hasAuthSession()) return;

    const withUrls = await enrichDevicesMissingControlUrl(base);
    if (!hasAuthSession()) return;

    setDevices(withUrls);
    setLastUpdated(new Date());
  }, []);

  const refresh = useCallback(async () => {
    if (!hasAuthSession()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await buildMergedList();
    } catch (e) {
      if (hasAuthSession()) {
        toast.error(e?.message || t('toast.loadDevicesFailed'));
      }
    } finally {
      setLoading(false);
    }
  }, [buildMergedList]);

  const runLanScanSubnets = useCallback(
    async (subnetPrefixes, options = {}) => {
      const { quiet = false } = options;
      const canRun = () => hasAuthSession();

      if (!canRun()) {
        return { totalFound: 0, aborted: true };
      }

      const list = [
        ...new Set(
          subnetPrefixes
            .map((s) => String(s).replace(/\.$/, '').trim())
            .filter((s) => /^\d{1,3}(\.\d{1,3}){2}$/.test(s))
        ),
      ];
      if (list.length === 0) {
        if (!quiet) toast.error(t('toast.networkUnknown'));
        return { totalFound: 0 };
      }
      setScanning(true);
      try {
        let totalFound = 0;
        let prev = getLanDevicesCache();
        for (const prefix of list) {
          if (!canRun()) break;
          const found = await scanSubnet(prefix, { shouldContinue: canRun });
          totalFound += found.length;
          if (!canRun()) break;
          prev = mergeDeviceLists(prev, found);
          setLanDevicesCache(prev);
        }
        if (canRun()) {
          await buildMergedList();
        }
        if (!quiet && canRun()) {
          if (totalFound === 0) {
            toast('Không tìm thấy thiết bị nào', { icon: 'ℹ️' });
          } else {
            toast.success(`Tìm thấy ${totalFound} thiết bị`);
          }
        }
        return { totalFound };
      } catch (e) {
        if (!quiet && canRun()) {
          toast.error(e?.message || t('toast.searchFailed'));
        }
        return { totalFound: 0, error: e };
      } finally {
        setScanning(false);
      }
    },
    [buildMergedList]
  );

  const runLanScan = useCallback(
    (subnetPrefix, options) => runLanScanSubnets([subnetPrefix], options),
    [runLanScanSubnets]
  );

  useEffect(() => {
    let cancelled = false;
    setInitialDiscoveryComplete(false);
    void (async () => {
      await refresh();
      if (cancelled || !hasAuthSession()) return;
      if (!cancelled && hasAuthSession()) setInitialDiscoveryComplete(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      if (!hasAuthSession()) return;
      buildMergedList().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [buildMergedList]);

  const value = useMemo(
    () => ({
      devices,
      loading,
      scanning,
      lastUpdated,
      initialDiscoveryComplete,
      refresh,
      runLanScan,
      runLanScanSubnets,
    }),
    [
      devices,
      loading,
      scanning,
      lastUpdated,
      initialDiscoveryComplete,
      refresh,
      runLanScan,
      runLanScanSubnets,
    ]
  );

  return (
    <DevicesContext.Provider value={value}>{children}</DevicesContext.Provider>
  );
}

export function useDevices() {
  const ctx = useContext(DevicesContext);
  if (!ctx) throw new Error('useDevices must be used within DevicesProvider');
  return ctx;
}
