'use client';

import { useLocale } from 'next-intl';

import { ApplicationReviewActions } from '@/components/platformAdmin/ApplicationReviewActions';
import type { ApplicationStatus } from '@/components/platformAdmin/usePlatformAdminData';
import type { useApplicationReview } from '@/components/platformAdmin/useApplicationReview';
import { CopyAddressButton } from '@/components/common/CopyAddressButton';
import type { NgoApplication } from '@/lib/api';
import { formatDate, truncateAddress } from '@/lib/format';

/** Status tabs, the application cards and the load-more button. */
export function ApplicationQueue({
  applications,
  totalApplications,
  loading,
  loadingMore,
  error,
  statusFilter,
  onStatusFilterChange,
  onLoadMore,
  review,
}: {
  applications: NgoApplication[];
  totalApplications: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  statusFilter: ApplicationStatus;
  onStatusFilterChange: (status: ApplicationStatus) => void;
  onLoadMore: () => Promise<void>;
  review: ReturnType<typeof useApplicationReview>;
}) {
  const locale = useLocale();

  return (
    <>
      <div className="mt-8 border-b border-gray-200 dark:border-gray-800">
        <div role="tablist" aria-label="Application status" className="-mb-px flex space-x-8">
          {(['PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={statusFilter === status}
              onClick={() => onStatusFilterChange(status)}
              className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400 ${
                statusFilter === status
                  ? 'border-black text-black dark:border-white dark:text-white'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300'
              }`}
            >
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

        {loading && (
          <p role="status" className="mt-8 text-gray-500 dark:text-gray-400">
            Loading…
          </p>
        )}

        {error && <p className="mt-8 text-red-600 dark:text-red-400">{error}</p>}

        {!loading && !error && applications.length === 0 && (
          <p className="mt-8 text-gray-600 dark:text-gray-400">No {statusFilter.toLowerCase()} applications.</p>
        )}

        {!loading && applications.length > 0 && (
          <ul className="mt-8 space-y-4">
            {applications.map((app) => (
              <li
                key={app.id}
                className="rounded-lg border border-gray-200 p-6 dark:border-gray-800"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{app.name}</h2>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {app.description}
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      {app.contactEmail}
                      {app.website ? ` · ${app.website}` : ''}
                      {app.country ? ` · ${app.country}` : ''}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                        {truncateAddress(app.ownerAddress)}
                      </p>
                      <CopyAddressButton address={app.ownerAddress} />
                    </div>
                    <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                      Submitted{' '}
                      {formatDate(app.createdAt, locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                  <ApplicationReviewActions app={app} statusFilter={statusFilter} review={review} />
                </div>
              </li>
            ))}
          </ul>
        )}

        {!loading && applications.length > 0 && applications.length < totalApplications && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => void onLoadMore()}
              disabled={loadingMore}
              className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              {loadingMore
                ? 'Loading…'
                : `Load more (${applications.length} of ${totalApplications})`}
            </button>
          </div>
        )}
    </>
  );
}
