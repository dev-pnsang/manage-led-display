import { useNavigate } from 'react-router-dom';

export default function DeviceCard({ device }) {
  const navigate = useNavigate();
  const online = device.online !== false;

  const openControl = () => {
    if (!device.control_url) {
      return;
    }
    navigate(`/viewer/${encodeURIComponent(device.id)}`);
  };

  return (
    <article className="flex flex-col rounded-lg border border-gray-100 bg-white p-4 shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
          <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900">{device.name}</h3>
          <p className="truncate text-sm text-gray-500">{device.ip || 'Chưa có IP'}</p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                online ? 'bg-green-500' : 'bg-gray-300'
              }`}
              title={online ? 'Online' : 'Offline'}
            />
            <span className="text-gray-600">{online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </div>
      <button
        type="button"
        onClick={openControl}
        disabled={!device.control_url}
        className="mt-4 min-h-[44px] w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {device.control_url ? 'Điều khiển' : 'Thiếu control URL'}
      </button>
    </article>
  );
}
