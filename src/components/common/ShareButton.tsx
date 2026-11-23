'use client';

import { useSyncExternalStore } from 'react';

import { useCopyToClipboard } from '@/lib/useCopyToClipboard';

export type ShareButtonProps = {
  path?: string;
  title?: string;
  text?: string;
  ariaLabel?: string;
};

function subscribe() {
  return () => {};
}

function getClientSnapshot() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

function getServerSnapshot() {
  return false;
}

/**
 * A share button that uses the device native share sheet (Web Share API) where
 * available, and falls back to a clipboard copy button with accessible status feedback.
 */
export function ShareButton({ path, title, text, ariaLabel }: ShareButtonProps = {}) {
  const canNativeShare = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
  const { status, copy } = useCopyToClipboard();

  const getUrl = () => (path ? `${window.location.origin}${path}` : window.location.href);

  const handleShare = async () => {
    const url = getUrl();
    if (canNativeShare && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: title || (typeof document !== 'undefined' ? document.title : undefined),
          text,
          url,
        });
        return;
      } catch (err) {
        // AbortError is thrown when user dismisses the share sheet; ignore it
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }
        // Unexpected error: fall back to clipboard copy
        void copy(url);
      }
    } else {
      void copy(url);
    }
  };

  if (canNativeShare) {
    return (
      <button
        type="button"
        onClick={handleShare}
        aria-label={ariaLabel || 'Share'}
        className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
      >
        Share
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        aria-label={
          status === 'copied'
            ? 'Link copied!'
            : status === 'error'
              ? 'Copy failed'
              : (ariaLabel || 'Copy link')
        }
        className={`rounded-md border px-3 py-1.5 text-sm font-medium ${
          status === 'error'
            ? 'border-red-300 text-red-700 dark:border-red-800 dark:text-red-400'
            : 'border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
        }`}
      >
        {status === 'copied' ? 'Link copied!' : status === 'error' ? 'Copy failed' : 'Copy link'}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {status === 'copied' && 'Link copied to clipboard.'}
        {status === 'error' && 'Could not copy the link. Copy it from the address bar instead.'}
      </span>
    </>
  );
}
