'use client';

import { useState } from 'react';
import type { AssembledTransaction } from '@stellar/stellar-sdk/contract';

import type { NgoApplication } from '@/lib/api';
import { reviewNgoApplication } from '@/lib/adminApi';
import { formatEstimatedFee } from '@/lib/format';
import { useNgoRegistryClient } from '@/lib/ngoRegistryClient';

type ShowToast = (type: 'success' | 'error' | 'info', message: string) => void;

/** Approve and reject flow for a pending application, including the confirm steps. */
export function useApplicationReview({
  address,
  signMessage,
  client,
  refresh,
  showToast,
}: {
  address: string | null;
  signMessage: Parameters<typeof reviewNgoApplication>[1];
  client: ReturnType<typeof useNgoRegistryClient>['client'];
  refresh: () => Promise<void>;
  showToast: ShowToast;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmingRejectId, setConfirmingRejectId] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  // The id of the application awaiting a second click, and the already-
  // built (not yet signed) tx for it — built once, during the first click,
  // so confirming signs the exact tx the fee estimate was shown for instead
  // of re-simulating it.
  const [confirmingApproveId, setConfirmingApproveId] = useState<string | null>(null);
  const [pendingApproveTx, setPendingApproveTx] = useState<AssembledTransaction<null> | null>(
    null,
  );

  const [retryApprovingId, setRetryApprovingId] = useState<string | null>(null);

  // Builds the (unsigned) approve tx and shows its fee estimate so the
  // admin can confirm before anything is signed. Building just simulates
  // the call — it doesn't touch the wallet or submit anything.
  async function handleApproveClick(app: NgoApplication): Promise<void> {
    if (!address || !client) return;
    setBusyId(app.id);
    try {
      const tx = await client.approve_ngo({ ngo_owner: app.ownerAddress });
      setEstimatedFee(formatEstimatedFee(tx.built?.fee));
      setPendingApproveTx(tx);
      setConfirmingApproveId(app.id);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  function handleCancelApprove(): void {
    setConfirmingApproveId(null);
    setPendingApproveTx(null);
    setEstimatedFee(null);
  }

  async function handleConfirmApprove(app: NgoApplication): Promise<void> {
    const isRetry = retryApprovingId === app.id;
    if (!address || (!isRetry && !pendingApproveTx)) return;
    setBusyId(app.id);
    let onChainDone = isRetry;
    try {
      // On-chain first: this is what actually flips Ngo.verified once the
      // indexer picks up the resulting event. If the wallet rejects or the
      // tx fails, we deliberately haven't touched the off-chain review
      // status yet — better an application stuck "pending" than one
      // marked "approved" while the NGO is still unverified on-chain.
      if (!isRetry) {
        await pendingApproveTx!.signAndSend();
        onChainDone = true;
      }

      // Now mark off-chain. If this fails, the NGO is already verified on-chain
      // but the app is still PENDING — surface a targeted retry action.
      await reviewNgoApplication(address, signMessage, app.id, 'approve', reviewNotes[app.id]);
      showToast('success', `${app.name} approved.`);
      setRetryApprovingId(null);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      // Once the on-chain approval has gone through, any failure is in the
      // off-chain marking — show the retry-marking-approved action.
      if (onChainDone) {
        showToast('error', `Couldn't mark as approved: ${message}`);
        setRetryApprovingId(app.id);
      } else {
        showToast('error', message);
        setRetryApprovingId(null);
      }
    } finally {
      setBusyId(null);
      setConfirmingApproveId(null);
      setPendingApproveTx(null);
      setEstimatedFee(null);
    }
  }

  function handleRetryMarkApproved(app: NgoApplication): void {
    void handleConfirmApprove(app);
  }

  async function handleReject(app: NgoApplication): Promise<void> {
    if (!address) return;
    setBusyId(app.id);
    try {
      await reviewNgoApplication(address, signMessage, app.id, 'reject', reviewNotes[app.id]);
      showToast('info', `${app.name} rejected.`);
      setConfirmingRejectId(null);
      await refresh();
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusyId(null);
    }
  }

  return {
    busyId,
    confirmingRejectId,
    setConfirmingRejectId,
    reviewNotes,
    setReviewNotes,
    estimatedFee,
    confirmingApproveId,
    retryApprovingId,
    handleApproveClick,
    handleCancelApprove,
    handleConfirmApprove,
    handleRetryMarkApproved,
    handleReject,
  };
}
