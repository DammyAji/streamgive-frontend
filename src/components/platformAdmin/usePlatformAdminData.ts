'use client';

import { useCallback, useEffect, useState } from 'react';

import type { Ngo, NgoApplication } from '@/lib/api';
import { getNgos } from '@/lib/api';
import { listNgoApplications } from '@/lib/adminApi';
import { useLatestRequest } from '@/lib/useLatestRequest';

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

function normalizeApplicationPage(value: unknown): { applications: NgoApplication[]; total: number; limit: number; offset: number } {
  if (Array.isArray(value)) {
    return { applications: value, total: value.length, limit: value.length, offset: 0 };
  }

  if (value && typeof value === 'object' && Array.isArray((value as { applications?: unknown }).applications)) {
    const page = value as { applications: NgoApplication[]; total?: number; limit?: number; offset?: number };
    return {
      applications: page.applications,
      total: page.total ?? page.applications.length,
      limit: page.limit ?? page.applications.length,
      offset: page.offset ?? 0,
    };
  }

  return { applications: [], total: 0, limit: 0, offset: 0 };
}

type ShowToast = (type: 'success' | 'error' | 'info', message: string) => void;

/** Loads the application queue and the verified NGO list for the admin wallet. */
export function usePlatformAdminData({
  address,
  signMessage,
  showToast,
}: {
  address: string | null;
  signMessage: Parameters<typeof listNgoApplications>[1];
  showToast: ShowToast;
}) {
  const [applications, setApplications] = useState<NgoApplication[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [verifiedNgos, setVerifiedNgos] = useState<Ngo[]>([]);
  // Starts true so the "no applications" state isn't painted before the
  // first fetch begins.
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus>('PENDING');

  // Only the most recently started refresh may write state, so a slow
  // response for a previous status tab or wallet can't overwrite newer data.
  const { begin, cancel } = useLatestRequest();

  const refresh = useCallback(async () => {
    if (!address) {
      cancel();
      return;
    }
    const request = begin();
    setLoading(true);
    setError(null);
    try {
      const [pageResult, ngos] = await Promise.all([
        listNgoApplications(address, signMessage, statusFilter),
        getNgos(request.signal),
      ]);
      if (!request.isCurrent()) return;
      const page = normalizeApplicationPage(pageResult);
      setApplications(page.applications);
      setTotalApplications(page.total);
      setVerifiedNgos(ngos.filter((n) => n.verified));
    } catch (err) {
      if (!request.isCurrent()) return;
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load applications — are you connected as the configured admin address?',
      );
    } finally {
      if (request.isCurrent()) setLoading(false);
    }
  }, [address, signMessage, statusFilter, begin, cancel]);

  useEffect(() => {
    // refresh() flips loading/error state synchronously before it awaits,
    // which set-state-in-effect flags. That is the intended behaviour for
    // a fetch-on-mount that also re-runs whenever `address` changes: the
    // spinner has to come back while the new address is loading. Deriving
    // loading from the data instead would be the way to drop this.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);


  async function loadMore(): Promise<void> {
    if (!address) return;
    setLoadingMore(true);
    try {
      const pageResult = await listNgoApplications(address, signMessage, statusFilter, applications.length);
      const page = normalizeApplicationPage(pageResult);
      // Append — don't replace — so rows already visible stay put.
      setApplications((prev) => [...prev, ...page.applications]);
      setTotalApplications(page.total);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Failed to load more applications.');
    } finally {
      setLoadingMore(false);
    }
  }

  return {
    applications,
    totalApplications,
    verifiedNgos,
    loading,
    loadingMore,
    error,
    statusFilter,
    setStatusFilter,
    refresh,
    loadMore,
  };
}
