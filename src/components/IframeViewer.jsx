export default function IframeViewer({ src, title }) {
  if (!src) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <p className="text-sm">Thiếu URL điều khiển (control_url). Hãy quét LAN hoặc cấu hình IP trên backend.</p>
      </div>
    );
  }

  return (
    <iframe
      title={title || 'Điều khiển thiết bị'}
      src={src}
      className="h-full w-full min-h-[50vh] flex-1 rounded-lg border border-gray-200 bg-white shadow-inner lg:min-h-0"
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
