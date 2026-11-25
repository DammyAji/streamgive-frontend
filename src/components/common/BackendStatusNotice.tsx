'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { getBackendReady } from '@/lib/api';

/**
 * Readiness probes hit the database and the Stellar RPC, and the backend
 * rate-limits them, so this is deliberately much slower than the 30s poll
 * used for live stream balances.
 */
export const BACKEND_STATUS_POLL_MS = 60_000;

type BackendStatus = 'unchecked' | 'available' | 'unavailable';

/**
 * One app-wide notice for a degraded backend, so a visitor doesn't have to
 * guess whether each page's individual error is their own connection.
 *
 * Polling stops entirely while the tab is hidden (rather than ticking on a
 * timer nobody can see) and catches up with one immediate check when the tab
 * becomes visible again. Each check supersedes any in-flight one so a slow
 * response can't overwrite a newer result.
 */
export function BackendStatusNotice() {
  const t = useTranslations('BackendStatusNotice');
  const [status, setStatus] = useState<BackendStatus>('unchecked');
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let mounted = true;

    function poll() {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      void getBackendReady(controller.signal)
        .then((ready) => {
          if (mounted && !controller.signal.aborted) {
            setStatus(ready ? 'available' : 'unavailable');
          }
        })
        .catch(() => {
          // getBackendReady resolves false on every failure; if it ever does
          // reject, leave the last known status alone rather than guessing.
        });
    }

    function startPolling() {
      if (interval === null) {
        interval = setInterval(poll, BACKEND_STATUS_POLL_MS);
      }
    }

    function stopPolling() {
      if (interval !== null) {
        clearInterval(interval);
        interval = null;
      }
      controllerRef.current?.abort();
      controllerRef.current = null;
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        poll();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === 'visible') {
      poll();
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (status !== 'unavailable') {
    return null;
  }

  return (
    <div
      role="alert"
      className="border-b border-amber-300 bg-amber-100 px-6 py-2 text-center text-sm font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300"
    >
      {t('unavailable')}
    </div>
  );
}
