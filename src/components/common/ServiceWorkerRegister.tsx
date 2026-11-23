'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.protocol.startsWith('http')
    ) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silently ignore registration failures in unsupported/restricted environments
      });
    }
  }, []);

  return null;
}
