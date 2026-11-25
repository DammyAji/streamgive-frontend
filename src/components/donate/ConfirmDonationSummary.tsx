'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';

import { formatDateTime, formatRate } from '@/lib/format';
import { NETWORK_NAME } from '@/lib/stellar';

/**
 * The confirmation step gating create_stream's actual contract call (see
 * CreateStreamForm.handleSubmit/handleConfirm). Structured the same way as
 * StreamDetailsModal (fixed overlay, role="dialog", Escape-to-close, focus
 * moved to the dialog and restored to the trigger on close) rather than
 * introducing a separate shared Modal primitive — there's exactly one other
 * modal in this codebase and it isn't itself built on a shared primitive,
 * so extracting one now would be speculative rather than justified by
 * actual reuse.
 */
export function ConfirmDonationSummary({
  ngoLabel,
  tokenLabel,
  amount,
  rateRaw,
  decimals,
  durationLabel,
  effectiveEndDate,
  networkMismatch,
  onConfirm,
  onCancel,
}: {
  ngoLabel: string;
  tokenLabel: string;
  amount: string;
  rateRaw: bigint | null;
  decimals: number;
  durationLabel: string;
  effectiveEndDate: Date;
  networkMismatch: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations('CreateStreamForm');
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  // Scroll lock — same pattern as StreamDetailsModal.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Move focus into the dialog on open. Restore is handled by the caller
  // via triggerRef so it runs after the parent re-enables the trigger button.
  useEffect(() => {
    confirmButtonRef.current?.focus();
  }, []);

  // Escape + Tab focus trap — same pattern as StreamDetailsModal.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCancel();
        return;
      }

      if (event.key === 'Tab') {
        if (!dialogRef.current) return;

        const focusableElements = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button, input, textarea, select, details, [tabindex]:not([tabindex="-1"])',
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true',
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            event.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            event.preventDefault();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const perSecondRate =
    rateRaw !== null ? t('ratePerSecond', { rate: formatRate(rateRaw, decimals) }) : '—';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-donation-heading"
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-donation-heading" className="text-lg font-semibold">
          {t('confirmHeading')}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('confirmDescription')}
        </p>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('ngo')}</dt>
            <dd className="break-all text-right font-medium">{ngoLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('token')}</dt>
            <dd className="font-medium">{tokenLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('totalAmount')}</dt>
            <dd className="font-medium">{amount}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('rate')}</dt>
            <dd className="font-medium">{perSecondRate}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('duration')}</dt>
            <dd className="font-medium">{durationLabel}</dd>
          </div>
          <div className="flex items-center justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">{t('ends')}</dt>
            <dd className="font-medium">
              {formatDateTime(effectiveEndDate.toISOString(), locale)}
            </dd>
          </div>
        </dl>

        {networkMismatch && (
          <p role="alert" className="mt-6 text-sm text-amber-700 dark:text-amber-400">
            {t('networkMismatch', { network: NETWORK_NAME })}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:focus-visible:ring-teal-400"
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={networkMismatch}
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus-visible:ring-teal-400"
          >
            {t('confirmAndSign')}
          </button>
        </div>
      </div>
    </div>
  );
}
