import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import IframeViewer from '../components/IframeViewer.jsx';
import { useDevices } from '../context/DevicesContext.jsx';
import { clearSession, getDisplayName } from '../services/storage';

export default function DeviceViewerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { devices } = useDevices();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const decodedId = id ? decodeURIComponent(id) : '';

  const current = useMemo(
    () => devices.find((d) => String(d.id) === decodedId),
    [devices, decodedId]
  );

  const selectDevice = (d) => {
    if (!d.control_url) {
      toast.error('Thiết bị chưa có URL điều khiển');
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
            ← Về danh sách
          </Link>
        </header>
        <div className="flex flex-1 items-center justify-center p-6 text-center text-gray-600">
          Không tìm thấy thiết bị.{' '}
          <Link to="/" className="ml-1 text-blue-600">
            Quay lại
          </Link>
        </div>
      </div>
    );
  }

  const sidebar = (
    <aside className="flex w-full flex-col border-r border-gray-200 bg-white lg:w-72 lg:shrink-0">
      <div className="border-b border-gray-100 p-4">
        <Link to="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← Dashboard
        </Link>
        <p className="mt-2 truncate text-sm text-gray-500">{getDisplayName()}</p>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
          Thiết bị
        </p>
        <ul className="space-y-1">
          {devices.map((d) => (
            <li key={d.id}>
              <button
                type="button"
                onClick={() => selectDevice(d)}
                className={`flex w-full min-h-[44px] items-center rounded-lg px-3 py-2 text-left text-sm ${
                  String(d.id) === decodedId
                    ? 'bg-blue-50 font-medium text-blue-800'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="truncate">{d.name}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-gray-100 p-2">
        <button
          type="button"
          onClick={logout}
          className="w-full min-h-[44px] rounded-lg px-3 text-sm text-red-600 hover:bg-red-50"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-[100dvh] flex-col bg-gray-50 lg:flex-row">
      <div className="hidden lg:flex lg:min-h-0 lg:flex-1">{sidebar}</div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-200 bg-white p-2 text-gray-700"
            aria-label="Chọn thiết bị"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-gray-900">{current.name}</p>
            <p className="truncate text-xs text-gray-500">{current.ip || '—'}</p>
          </div>
          <Link
            to="/"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-sm text-blue-600"
          >
            List
          </Link>
        </div>

        <div className="min-h-0 flex-1 p-3 lg:p-4">
          <div className="flex h-full min-h-[50vh] flex-col rounded-lg border border-gray-100 bg-white shadow-md lg:min-h-0">
            <IframeViewer src={current.control_url} title={current.name} />
          </div>
        </div>
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <span className="font-semibold text-gray-900">Chọn thiết bị</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] text-gray-500"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[55vh] overflow-y-auto p-2">
              {devices.map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => selectDevice(d)}
                  className={`mb-1 flex w-full min-h-[44px] items-center rounded-lg px-3 py-2 text-left text-sm ${
                    String(d.id) === decodedId ? 'bg-blue-50 font-medium text-blue-800' : 'hover:bg-gray-50'
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
