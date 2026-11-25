'use client';

import { useTranslations } from 'next-intl';

import { useCopyToClipboard } from '@/lib/useCopyToClipboard';

/** Copies a link to the clipboard with a brief confirmation. Defaults to
 * the current page's URL; pass `path` to copy a link to a different page
 * instead (e.g. sharing the NGO's profile from its donate-success page). */
export function CopyLinkButton({ path }: { path?: string } = {}) {
  const t = useTranslations('CopyLinkButton');
  const { status, copy } = useCopyToClipboard();

  return (
    <>
      <button
        type="button"
        onClick={() => void copy(path ? `${window.location.origin}${path}` : window.location.href)}
        className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
          status === 'error'
            ? 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400'
            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
        }`}
      >
        {status === 'copied' ? t('copied') : status === 'error' ? t('failed') : t('copy')}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === 'copied' && t('announceCopied')}
        {status === 'error' && t('announceFailed')}
      </span>
    </>
  );
}
