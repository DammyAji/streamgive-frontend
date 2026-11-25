'use client';

import { useState } from 'react';

import type { Ngo } from '@/lib/api';
import { useNgoRegistryClient } from '@/lib/ngoRegistryClient';

type ShowToast = (type: 'success' | 'error' | 'info', message: string) => void;

/** Revoke flow for a verified NGO, including its confirm step. */
export function useRevokeNgo({
  address,
  client,
  refresh,
  showToast,
}: {
  address: string | null;
  client: ReturnType<typeof useNgoRegistryClient>['client'];
  refresh: () => Promise<void>;
  showToast: ShowToast;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);

  async function handleRevoke(ngo: Ngo): Promise<void> {
    if (!address || !client) return;
    setBusyId(ngo.id);
    try {
      const tx = await client.revoke_ngo({ ngo_owner: ngo.ownerAddress });
      await tx.signAndSend();
      showToast('success', `${ngo.name} revoked.`);
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
      setRevokeConfirmId(null);
    }
  }

  return { busyId, revokeConfirmId, setRevokeConfirmId, handleRevoke };
}
