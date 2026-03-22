import { useI18n } from '../i18n/I18nContext.jsx';

export default function IframeViewer({ src, title, fullBleed = false }) {
  const { t } = useI18n();
  if (!src) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center rounded-lg border border-amber-200 bg-amber-50 p-6 text-center text-amber-900">
        <p className="text-sm">{t('iframe.missingUrl')}</p>
      </div>
    );
  }

  const frameClass = fullBleed
    ? 'absolute inset-0 h-full w-full border-0 bg-white'
    : 'h-full w-full min-h-[50vh] flex-1 rounded-lg border border-gray-200 bg-white shadow-inner lg:min-h-0';

  return (
    <iframe
      title={title || t('iframe.title')}
      src={src}
      className={frameClass}
      sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
