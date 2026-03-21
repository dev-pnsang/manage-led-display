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
import {
  getLanDevicesCache,
  getUserData,
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

  const buildMergedList = useCallback(async () => {
    const user = getUserData();
    const fromLogin = devicesFromLoginUser(user);
    const lanCached = getLanDevicesCache();

    let fromApi = [];
    try {
      const { skipped, data } = await fetchDevicesFromServer();
      if (!skipped && Array.isArray(data) && data.length > 0) {
        fromApi = normalizeDevicesApiResponse(data);
      }
    } catch {
      /* Backend có thể chưa có GET /api/devices */
    }

    const base =
      fromApi.length > 0
        ? mergeDeviceLists(fromApi, lanCached)
        : mergeDeviceLists(fromLogin, lanCached);

    setDevices(base);
    setLastUpdated(new Date());
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await buildMergedList();
    } catch (e) {
      toast.error(e?.message || 'Không tải được danh sách thiết bị');
    } finally {
      setLoading(false);
    }
  }, [buildMergedList]);

  useEffect(() => {
    refresh();
    const id = window.setInterval(() => {
      buildMergedList().catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [buildMergedList, refresh]);

  const runLanScan = useCallback(
    async (subnetPrefix) => {
      setScanning(true);
      try {
        const found = await scanSubnet(subnetPrefix);
        if (found.length === 0) {
          toast('Không tìm thấy thiết bị nào', { icon: 'ℹ️' });
        } else {
          toast.success(`Tìm thấy ${found.length} thiết bị`);
        }
        const prev = getLanDevicesCache();
        setLanDevicesCache(mergeDeviceLists(prev, found));
        await buildMergedList();
      } catch (e) {
        toast.error(e?.message || 'Quét mạng thất bại');
      } finally {
        setScanning(false);
      }
    },
    [buildMergedList]
  );

  const value = useMemo(
    () => ({
      devices,
      loading,
      scanning,
      lastUpdated,
      refresh,
      runLanScan,
    }),
    [devices, loading, scanning, lastUpdated, refresh, runLanScan]
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
