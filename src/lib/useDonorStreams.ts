'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getStreams, type Stream } from '@/lib/api';
import { useLatestRequest } from '@/lib/useLatestRequest';

// Keeps balances/withdrawn amounts from going stale while the tab sits
// open, same polling approach as the impact page (src/app/impact/page.tsx).
const POLL_INTERVAL_MS = 30_000;

/**
 * Loads the streams a donor has opened and keeps them fresh while the tab is
 * visible. `onFirstLoad` runs once per connected wallet, after the first
 * successful fetch, so the page can pick its starting filter.
 */
export function useDonorStreams(
  address: string | null,
  onFirstLoad?: (streams: Stream[]) => void,
) {
  const [streams, setStreams] = useState<Stream[]>([]);
  // Starts true so a connected donor never sees the empty state in the
  // render before the first fetch begins.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const firstLoadDone = useRef(false);
  const onFirstLoadRef = useRef(onFirstLoad);
  useEffect(() => {
    onFirstLoadRef.current = onFirstLoad;
  });

  // Drop any streams fetched under a previous address as soon as `address`
  // changes, during render rather than in an effect, so a stale list from
  // the old wallet is never painted (even briefly) under the new one.
  const [prevAddress, setPrevAddress] = useState(address);
  if (address !== prevAddress) {
    setPrevAddress(address);
    setStreams([]);
    setLoadError(false);
    setLoading(true);
  }

  // Shared by refresh() and the poll below, so a poll can't overlap a manual
  // refresh (or a wallet switch) and land after it with older data.
  const { begin, cancel } = useLatestRequest();

  const refresh = useCallback(() => {
    if (!address) {
      cancel();
      setStreams([]);
      firstLoadDone.current = false;
      return;
    }

    const request = begin();
    setLoading(true);
    setLoadError(false);
    getStreams({ donor: address }, request.signal)
      .then((data) => {
        if (!request.isCurrent()) return;
        setStreams(data);
        if (!firstLoadDone.current) {
          firstLoadDone.current = true;
          onFirstLoadRef.current?.(data);
        }
      })
      .catch(() => {
        if (request.isCurrent()) setLoadError(true);
      })
      .finally(() => {
        if (request.isCurrent()) setLoading(false);
      });
  }, [address, begin, cancel]);

  useEffect(() => {
    // refresh() flips loading/error state synchronously before it awaits,
    // which set-state-in-effect flags. That is the intended behaviour for
    // a fetch-on-mount that also re-runs whenever `address` changes: the
    // spinner has to come back while the new address is loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!address) return;

    // A quiet background refresh. Unlike refresh() above, it never flips
    // `loading` on (the list would otherwise flash "Loading your streams…"
    // every 30s) and never re-runs the first-load filter auto-selection.
    // It shares refresh()'s request guard: starting a poll supersedes an
    // in-flight refresh and vice versa, and a superseded or post-cleanup
    // response is dropped. Because it can supersede a refresh, a poll that
    // settles also clears `loading`.
    let interval: ReturnType<typeof setInterval> | null = null;

    function poll() {
      const request = begin();
      getStreams({ donor: address as string }, request.signal)
        .then((data) => {
          if (!request.isCurrent()) return;
          setStreams(data);
          setLoadError(false);
          setLoading(false);
        })
        .catch((err: unknown) => {
          if (!request.isCurrent()) return;
          if (!(err instanceof DOMException && err.name === 'AbortError')) {
            setLoadError(true);
          }
          setLoading(false);
        });
    }

    function startPolling() {
      if (interval !== null) return;
      interval = setInterval(poll, POLL_INTERVAL_MS);
    }

    function stopPolling() {
      if (interval === null) return;
      clearInterval(interval);
      interval = null;
    }

    // Pausing while the tab is hidden means actually stopping the
    // interval (not just skipping a tick on a timer that keeps running),
    // and catching up with one immediate poll on becoming visible again.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        poll();
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancel();
    };
  }, [address, begin, cancel]);

  return { streams, loading, loadError, refresh };
}
