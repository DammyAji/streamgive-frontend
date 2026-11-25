'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useId, useState } from 'react';

import { ConnectWalletPrompt } from '@/components/common/ConnectWalletPrompt';
import { EndingSoonBadge } from '@/components/dashboard/EndingSoonBadge';
import { StreamControls } from '@/components/dashboard/StreamControls';
import { StreamDetailsModal } from '@/components/streams/StreamDetailsModal';
import { useWallet } from '@/components/wallet/WalletProvider';
import { getStreams, type Stream } from '@/lib/api';
import { buildDonationHistoryCsv } from '@/lib/csv';
import { formatTokenAmount, formatTokenTotals } from '@/lib/format';
import { isEndingSoon } from '@/lib/streamEnd';
import { useLatestRequest } from '@/lib/useLatestRequest';
import { useSharedClock } from '@/lib/useSharedClock';

// Client-side pagination over the already-fetched list — same interim
// approach as NgoExplorer, until the backend exposes real limit/offset
// pagination for /streams.
const PAGE_SIZE = 10;

// Keeps balances/withdrawn amounts from going stale while the tab sits
// open — same polling approach as the impact page (src/app/impact/page.tsx).
const POLL_INTERVAL_MS = 30_000;

function LiveBalance({ stream }: { stream: Stream }) {
  const t = useTranslations('Dashboard');
  // All rows share one clock instead of each starting its own timer.
  const now = useSharedClock();
  const [helpOpen, setHelpOpen] = useState(false);
  const helpId = useId();

  if (stream.status !== 'ACTIVE') {
    return <>{formatTokenAmount(stream.balance, stream.tokenAddress)}</>;
  }

  const startsAt = stream.startsAt ? new Date(stream.startsAt).getTime() : 0;
  if (startsAt > 0 && now > 0 && now < startsAt) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1">
        <span>{formatTokenAmount(stream.balance, stream.tokenAddress)}</span>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          {t('scheduled')}
        </span>
        <span className="text-xs text-gray-600 dark:text-gray-400">
          {t('startsOn', { date: new Date(startsAt).toLocaleString() })}
        </span>
      </span>
    );
  }

  let estimatedBalance = BigInt(stream.balance);
  if (now > 0) {
    // The live balance only begins accruing once the stream has started.
    const updatedAt = Math.max(new Date(stream.updatedAt).getTime(), startsAt);
    const secondsSince = BigInt(Math.max(0, Math.floor((now - updatedAt) / 1000)));
    estimatedBalance = estimatedBalance - BigInt(stream.rate) * secondsSince;
    if (estimatedBalance < 0n) {
      estimatedBalance = 0n;
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span>
        {formatTokenAmount(estimatedBalance.toString(), stream.tokenAddress)} {t('estimated')}
      </span>
      <button
        type="button"
        aria-label={t('estimatedBalanceHelp')}
        aria-expanded={helpOpen}
        aria-controls={helpId}
        onClick={() => setHelpOpen((open) => !open)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setHelpOpen(false);
          }
        }}
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 text-xs leading-none"
      >
        i
      </button>
      {helpOpen && (
        <span id={helpId} role="note" className="block w-full text-xs text-gray-600 dark:text-gray-400">
          {t('estimatedBalanceHelp')}
        </span>
      )}
    </span>
  );
}

function downloadDonationHistoryCsv(streams: Stream[]): void {
  const blob = new Blob([buildDonationHistoryCsv(streams)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'streamgive-donations.csv';
  // Some browsers cancel the download if the object URL disappears too
  // soon after the click, so the anchor has to actually be in the
  // document when it's clicked, and the URL needs to outlive the click
  // itself rather than being revoked synchronously right after it.
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export type SortOrder = 'newest' | 'oldest' | 'largest-committed' | 'ending-soonest';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');
  const { address } = useWallet();
  const [streams, setStreams] = useState<Stream[]>([]);
  // Starts true so a connected donor never sees the empty state in the
  // render before the first fetch begins.
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [detailsStream, setDetailsStream] = useState<Stream | null>(null);
  const [filter, setFilter] = useState<'ALL' | 'ACTIVE' | 'CANCELLED'>('ALL');
  const [, setFilterInitialized] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

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
      setFilterInitialized(false);
      return;
    }

    const request = begin();
    setLoading(true);
    setLoadError(false);
    getStreams({ donor: address }, request.signal)
      .then((data) => {
        if (!request.isCurrent()) return;
        setStreams(data);
        setFilterInitialized((prev) => {
          if (!prev) {
            setFilter(data.some((s) => s.status === 'ACTIVE') ? 'ACTIVE' : 'ALL');
            return true;
          }
          return prev;
        });
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
    // spinner has to come back while the new address is loading. Deriving
    // loading from the data instead would be the way to drop this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!address) return;

    // A quiet background refresh — unlike refresh() above, it never flips
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

  const totalCommitted = formatTokenTotals(
    streams.map((s) => ({
      tokenAddress: s.tokenAddress,
      raw: BigInt(s.balance) + BigInt(s.withdrawn),
    })),
  );
  const activeCount = streams.filter((s) => s.status === 'ACTIVE').length;
  const remainingTime = (stream: Stream) => {
    const balance = BigInt(stream.balance);
    if (balance <= 0n) return t('fullyDrained');
    const rate = BigInt(stream.rate);
    if (rate <= 0n) return '';
    const seconds = Number(balance / rate);
    if (seconds < 60) return t('secondsRemaining', { count: seconds });
    if (seconds < 3600) return t('minutesRemaining', { count: Math.floor(seconds / 60) });
    if (seconds < 86400) return t('hoursRemaining', { count: Math.floor(seconds / 3600) });
    return t('daysRemaining', { count: Math.floor(seconds / 86400) });
  };
  const trimmedSearchQuery = searchQuery.trim();
  const filteredStreams = streams.filter((s) => {
    if (filter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
    if (filter === 'CANCELLED' && s.status !== 'CANCELLED') return false;
    // Emptying the search box naturally clears the filter — an empty
    // trimmedSearchQuery is falsy, so this check never excludes anything.
    if (trimmedSearchQuery && !s.onChainId.includes(trimmedSearchQuery)) return false;
    return true;
  });

  const sortedStreams = [...filteredStreams].sort((a, b) => {
    if (sortOrder === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    if (sortOrder === 'oldest') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    if (sortOrder === 'largest-committed') {
      const commA = BigInt(a.balance) + BigInt(a.withdrawn);
      const commB = BigInt(b.balance) + BigInt(b.withdrawn);
      if (commB > commA) return 1;
      if (commB < commA) return -1;
      return 0;
    }
    if (sortOrder === 'ending-soonest') {
      const getRemaining = (s: Stream) => {
        if (s.status !== 'ACTIVE' || BigInt(s.rate) <= 0n) return 999999999999999n;
        const b = BigInt(s.balance);
        if (b <= 0n) return 0n;
        return b / BigInt(s.rate);
      };
      const remA = getRemaining(a);
      const remB = getRemaining(b);
      if (remA > remB) return 1;
      if (remA < remB) return -1;
      return 0;
    }
    return 0;
  });

  const visibleStreams = sortedStreams.slice(0, visibleCount);
  const hasMore = visibleCount < sortedStreams.length;

  // A new filter, search, or sort order starts back at the first page
  function handleFilterChange(next: 'ALL' | 'ACTIVE' | 'CANCELLED'): void {
    setFilter(next);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSearchChange(value: string): void {
    setSearchQuery(value);
    setVisibleCount(PAGE_SIZE);
  }

  function handleSortChange(next: SortOrder): void {
    setSortOrder(next);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <>
      <main id="main" className="px-6 py-16 sm:px-12">
        <h1 className="text-2xl font-bold">{t('heading')}</h1>

        {!address && (
          <ConnectWalletPrompt className="mt-8" message={t('connectPrompt')} />
        )}

        {address && loading && (
          <p role="status" className="mt-8 text-gray-500 dark:text-gray-400">
            {t('loading')}
          </p>
        )}

        {address && !loading && loadError && streams.length === 0 && (
          <div className="mt-8">
            <p className="text-red-600 dark:text-red-400">
              {t('loadError')}
            </p>
            <button
              type="button"
              onClick={refresh}
              className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {t('retry')}
            </button>
          </div>
        )}

        {address && !loading && !loadError && streams.length === 0 && (
          <p className="mt-8 text-gray-600 dark:text-gray-400">
            {t('emptyBeforeLink')}{' '}
            <Link href="/ngos" className="underline">
              {t('exploreNgos')}
            </Link>
            {t('emptyAfterLink')}
          </p>
        )}

        {address && !loading && streams.length > 0 && (
          <>
            {/* A later poll failed, but we still have the last good list —
                keep showing it rather than replacing it with an error. */}
            {loadError && (
              <p role="status" className="mb-4 text-sm text-amber-700 dark:text-amber-400">
                {t('refreshError')}
              </p>
            )}

            <div className="flex flex-wrap items-start justify-between gap-4">
              <dl className="grid grid-cols-3 gap-6 sm:w-fit sm:grid-cols-3">
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('totalStreams', { count: streams.length })}</dt>
                  <dd className="text-lg font-semibold">{streams.length}</dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('totalCommitted')}</dt>
                  <dd className="text-lg font-semibold">
                    {totalCommitted}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm text-gray-500 dark:text-gray-400">{t('activeStreams', { count: activeCount })}</dt>
                  <dd className="text-lg font-semibold">{activeCount}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={() => downloadDonationHistoryCsv(filteredStreams)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              >
                {t('exportCsv')}
              </button>

            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-800">
              <div role="tablist" aria-label={t('filterStreams')} className="flex gap-4">
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'ALL'}
                  onClick={() => handleFilterChange('ALL')}
                  className={`pb-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${filter === 'ALL' ? 'border-b-2 border-black text-black dark:border-white dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  {t('all')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'ACTIVE'}
                  onClick={() => handleFilterChange('ACTIVE')}
                  className={`pb-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${filter === 'ACTIVE' ? 'border-b-2 border-black text-black dark:border-white dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  {t('active')}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={filter === 'CANCELLED'}
                  onClick={() => handleFilterChange('CANCELLED')}
                  className={`pb-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${filter === 'CANCELLED' ? 'border-b-2 border-black text-black dark:border-white dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}`}
                >
                  {t('cancelled')}
                </button>
              </div>

              <div className="flex items-center gap-2 pb-2">
                <label htmlFor="sort-order" className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('sortLabel')}
                </label>
                <select
                  id="sort-order"
                  aria-label={t('sortBy')}
                  value={sortOrder}
                  onChange={(event) => handleSortChange(event.target.value as SortOrder)}
                  className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-900"
                >
                  <option value="newest">{t('newest')}</option>
                  <option value="oldest">{t('oldest')}</option>
                  <option value="largest-committed">{t('largestCommitted')}</option>
                  <option value="ending-soonest">{t('endingSoonest')}</option>
                </select>
              </div>
            </div>

            <label className="mt-4 block max-w-xs">
              <span className="sr-only">{t('searchLabel')}</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => handleSearchChange(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              />
            </label>

            {filteredStreams.length === 0 ? (
              <p className="mt-8 text-gray-600 dark:text-gray-400">
                {trimmedSearchQuery
                  ? t('noSearchResults', { query: trimmedSearchQuery })
                  : t(filter === 'ACTIVE' ? 'noActiveStreams' : filter === 'CANCELLED' ? 'noCancelledStreams' : 'noStreams')}
              </p>
            ) : (
              <ul className="mt-6 space-y-4">
                {visibleStreams.map((stream) => (
                  <li
                    key={stream.id}
                    className="stream-card rounded-lg border border-gray-200 p-6 dark:border-gray-800"
                  >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <Link
                        href={`/ngos/${stream.ngo.id}`}
                        className="font-semibold hover:underline"
                      >
                        {stream.ngo.name}
                      </Link>
                      {isEndingSoon(stream) && <EndingSoonBadge />}
                      {stream.memo?.trim() && (
                        <p
                          title={stream.memo}
                          className="mt-1 line-clamp-2 max-w-md break-words text-sm text-gray-700 dark:text-gray-300"
                        >
                          {stream.memo}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {stream.status === 'PAUSED' ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900 dark:text-amber-300">
                            {t('paused')}
                          </span>
                        ) : (
                          t(stream.status === 'ACTIVE' ? 'active' : 'cancelled')
                        )}{' '}
                        · {t('balance')}{' '}
                        <LiveBalance stream={stream} /> · {t('withdrawn')} {formatTokenAmount(stream.withdrawn, stream.tokenAddress)}
                        {stream.status === 'ACTIVE' && remainingTime(stream)
                          ? ` · ${remainingTime(stream)}`
                          : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDetailsStream(stream)}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        {t('viewDetails')}
                      </button>
                      {(stream.status === 'ACTIVE' || stream.status === 'PAUSED') && (
                        <StreamControls stream={stream} onChanged={refresh} />
                      )}
                    </div>
                  </div>
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                >
                  {t('loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {detailsStream && (
        <StreamDetailsModal stream={detailsStream} onClose={() => setDetailsStream(null)} />
      )}
    </>
  );
}
