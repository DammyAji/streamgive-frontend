'use client';

import type { NgoApplication } from '@/lib/api';
import type { ApplicationStatus } from '@/components/platformAdmin/usePlatformAdminData';
import type { useApplicationReview } from '@/components/platformAdmin/useApplicationReview';

/** The review column of an application card: note, approve/reject confirms, retry. */
export function ApplicationReviewActions({
  app,
  statusFilter,
  review,
}: {
  app: NgoApplication;
  statusFilter: ApplicationStatus;
  review: ReturnType<typeof useApplicationReview>;
}) {
  const {
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
  } = review;

  return (
    <div className="flex w-full shrink-0 flex-col gap-2 sm:w-64">
      {statusFilter === 'PENDING' ? (
        <>
      <label className="block">
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Review note (optional)
        </span>
        <textarea
          value={reviewNotes[app.id] ?? ''}
          onChange={(event) =>
            setReviewNotes((notes) => ({ ...notes, [app.id]: event.target.value }))
          }
          rows={2}
          placeholder="Why is this approved or rejected?"
          className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
      </label>
      <div className="flex gap-2">
        {confirmingApproveId === app.id ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Approve {app.name}?
              {estimatedFee ? ` Estimated fee: ${estimatedFee}.` : ''}
            </span>
            <button
              type="button"
              onClick={() => void handleConfirmApprove(app)}
              disabled={busyId === app.id}
              className="rounded-md bg-black px-3 py-1 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {busyId === app.id ? 'Working…' : 'Yes, approve'}
            </button>
            <button
              type="button"
              onClick={handleCancelApprove}
              disabled={busyId === app.id}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
            >
              Never mind
            </button>
          </div>
        ) : confirmingRejectId === app.id ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Reject this application?
            </span>
            <button
              type="button"
              onClick={() => void handleReject(app)}
              disabled={busyId === app.id}
              className="rounded-md bg-red-600 px-3 py-1 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 dark:bg-red-500 dark:hover:bg-red-600"
            >
              {busyId === app.id ? 'Working…' : 'Yes, reject'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRejectId(null)}
              disabled={busyId === app.id}
              className="rounded-md border border-gray-300 px-3 py-1 text-sm font-medium disabled:opacity-50 dark:border-gray-700"
            >
              Never mind
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void handleApproveClick(app)}
              disabled={busyId === app.id}
              className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
            >
              {busyId === app.id ? 'Working…' : 'Approve'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmingRejectId(app.id)}
              disabled={busyId === app.id}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Reject
            </button>
          </>
        )}
      </div>
      {retryApprovingId === app.id && (
        <div className="flex flex-wrap items-center justify-end gap-2 rounded-md bg-amber-50 p-2 dark:bg-amber-900/20">
          <span className="text-xs text-amber-900 dark:text-amber-200">
            NGO verified on-chain but couldn&apos;t mark approved in the system.
          </span>
          <button
            type="button"
            onClick={() => void handleRetryMarkApproved(app)}
            disabled={busyId === app.id}
            className="rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50 dark:bg-amber-500 dark:hover:bg-amber-600"
          >
            {busyId === app.id ? 'Retrying…' : 'Retry marking approved'}
          </button>
        </div>
      )}
        </>
      ) : (
        <div>
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Review note
          </span>
          <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {app.reviewNote || 'No note provided.'}
          </p>
        </div>
      )}
    </div>
  );
}
