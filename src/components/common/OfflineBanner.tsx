'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

/** A single accessible banner that makes it clear a failed request is due to
 * the visitor being offline, rather than the service being broken. */
export function OfflineBanner() {
  const t = useTranslations('OfflineBanner');
  // SSR has no navigator; assume online until the browser tells us otherwise
  // so the banner never appears in server-rendered markup.
  const [online, setOnline] = useState(
    () => typeof navigator === 'undefined' || navigator.onLine,
  );

  useEffect(() => {
    const handleOffline = () => setOnline(false);
    const handleOnline = () => setOnline(true);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (online) {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-b border-red-300 bg-red-100 px-6 py-2 text-center text-sm font-medium text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
    >
      {t('offline')}
    </div>
  );
}
