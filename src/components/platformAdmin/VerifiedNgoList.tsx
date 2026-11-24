'use client';

import { useLocale } from 'next-intl';

import { CopyAddressButton } from '@/components/common/CopyAddressButton';
import { useRevokeNgo } from '@/components/platformAdmin/useRevokeNgo';
import type { Ngo } from '@/lib/api';
import { formatDate, truncateAddress } from '@/lib/format';

/** The verified NGO list with its revoke confirm step. */
export function VerifiedNgoList({
  verifiedNgos,
  revoke,
}: {
  verifiedNgos: Ngo[];
  revoke: ReturnType<typeof useRevokeNgo>;
}) {
  const locale = useLocale();
  const { busyId, revokeConfirmId, setRevokeConfirmId, handleRevoke } = revoke;

  return (
      <div className="mt-16">
        <h2 className="text-xl font-bold">Verified NGOs</h2>
        {verifiedNgos.length === 0 ? (
          <p className="mt-4 text-gray-600 dark:text-gray-400">No verified NGOs.</p>
        ) : (
          <ul className="mt-6 space-y-4">
            {verifiedNgos.map((ngo) => (
              <li
                key={ngo.id}
                className="flex flex-col gap-4 rounded-lg border border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800"
              >
                <div>
                  <h3 className="font-semibold">{ngo.name}</h3>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-mono text-xs text-gray-500 dark:text-gray-400">
                      {truncateAddress(ngo.ownerAddress)}
                    </p>
                    <CopyAddressButton address={ngo.ownerAddress} />
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                    Registered{' '}
                    {formatDate(ngo.createdAt, locale, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {revokeConfirmId === ngo.id ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRevokeConfirmId(null)}
                        disabled={busyId === ngo.id}
                        className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRevoke(ngo)}
                        disabled={busyId === ngo.id}
                        className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {busyId === ngo.id ? 'Working…' : 'Confirm Revoke'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setRevokeConfirmId(ngo.id)}
                      disabled={busyId === ngo.id}
                      className="rounded-md border border-red-200 text-red-600 px-4 py-2 text-sm font-medium hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-500 dark:hover:bg-red-900/20"
                    >
                      Revoke
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
  );
}
