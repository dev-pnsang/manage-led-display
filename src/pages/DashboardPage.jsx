import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header.jsx';
import DeviceList from '../components/DeviceList.jsx';
import { useDevices } from '../context/DevicesContext.jsx';
import { clearSession, getDisplayName } from '../services/storage';

export default function DashboardPage() {
  const navigate = useNavigate();
  const {
    devices,
    loading,
    scanning,
    lastUpdated,
    refresh,
    runLanScan,
  } = useDevices();
  const [subnet, setSubnet] = useState('192.168.1');
  const [scanOpen, setScanOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (devices.length === 1 && devices[0].control_url) {
      navigate(`/viewer/${encodeURIComponent(devices[0].id)}`, { replace: true });
    }
  }, [loading, devices, navigate]);

  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const formatTime = () => {
    if (!lastUpdated) return '—';
    return lastUpdated.toLocaleString();
  };

  const handleNetworkScan = async (e) => {
    e?.preventDefault();
    await runLanScan(subnet.trim());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header displayName={getDisplayName()} onLogout={logout} />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <section className="mb-6 rounded-lg border border-gray-100 bg-white p-4 shadow-md md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Thiết bị khả dụng</h2>
              <p className="text-sm text-gray-500">Cập nhật: {formatTime()}</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                disabled={scanning}
                className="min-h-[44px] rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {scanning ? 'Đang quét mạng…' : 'Quét mạng LAN'}
              </button>
              <button
                type="button"
                onClick={() => refresh()}
                className="min-h-[44px] rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Làm mới danh sách
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-400">
            Quét gọi <code className="rounded bg-gray-50 px-1">GET http://&lt;ip&gt;/api/system/status</code> trên
            từng host (CORS trên thiết bị phải cho phép domain web).
          </p>
        </section>

        <DeviceList
          devices={devices}
          loading={loading}
          onRescan={() => setScanOpen(true)}
        />
      </main>

      {scanOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="scan-title"
        >
          <div className="w-full max-w-md rounded-t-xl bg-white p-6 shadow-xl sm:rounded-xl">
            <h3 id="scan-title" className="text-lg font-semibold text-gray-900">
              Quét thiết bị trong mạng
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Nhập 3 octet đầu của subnet (ví dụ <code className="rounded bg-gray-100 px-1">192.168.1</code>), app
              sẽ thử .1–.254.
            </p>
            <form onSubmit={handleNetworkScan} className="mt-4 space-y-4">
              <div>
                <label htmlFor="subnet" className="mb-1 block text-sm font-medium text-gray-700">
                  Subnet
                </label>
                <input
                  id="subnet"
                  value={subnet}
                  onChange={(e) => setSubnet(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  placeholder="192.168.1"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setScanOpen(false)}
                  className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={scanning}
                  className="min-h-[44px] flex-1 rounded-lg bg-blue-600 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  Bắt đầu quét
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
