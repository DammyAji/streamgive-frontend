'use client';

import { useTranslations } from 'next-intl';

export function OfflineView() {
  const t = useTranslations('Offline');

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="rounded-full bg-teal-50 p-4 dark:bg-teal-950/50">
        <svg
          className="h-10 w-10 text-teal-600 dark:text-teal-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 4.243a9 9 0 01-2.829-6.364 9 9 0 012.829-6.364m2.828 2.828a5 5 0 012.829 1.414m-5.657 5.657L3 3"
          />
        </svg>
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
        {t('title')}
      </h1>
      <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-400">
        {t('description')}
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-6 rounded-md bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:bg-teal-500 dark:text-gray-950 dark:hover:bg-teal-400"
      >
        {t('retry')}
      </button>
    </div>
  );
}
