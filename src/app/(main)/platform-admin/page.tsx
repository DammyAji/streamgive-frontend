'use client';

import { ConnectWalletPrompt } from '@/components/common/ConnectWalletPrompt';
import { ApplicationQueue } from '@/components/platformAdmin/ApplicationQueue';
import { useApplicationReview } from '@/components/platformAdmin/useApplicationReview';
import { usePlatformAdminData } from '@/components/platformAdmin/usePlatformAdminData';
import { useRevokeNgo } from '@/components/platformAdmin/useRevokeNgo';
import { VerifiedNgoList } from '@/components/platformAdmin/VerifiedNgoList';
import { useToast } from '@/components/toast/ToastProvider';
import { useWallet } from '@/components/wallet/WalletProvider';
import { useNgoRegistryClient } from '@/lib/ngoRegistryClient';

export default function PlatformAdminPage() {
  const { address, signMessage } = useWallet();
  const { client, initError, retryInit } = useNgoRegistryClient();
  const { showToast } = useToast();

  const data = usePlatformAdminData({ address, signMessage, showToast });
  const review = useApplicationReview({
    address,
    signMessage,
    client,
    refresh: data.refresh,
    showToast,
  });
  const revoke = useRevokeNgo({ address, client, refresh: data.refresh, showToast });

  return (
    <main id="main" className="px-6 py-16 sm:px-12">
        <h1 className="text-2xl font-bold">Platform admin</h1>
        <p className="mt-2 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          Review pending NGO applications. Only the wallet configured as the platform&apos;s
          <code className="mx-1 rounded bg-gray-100 px-1 dark:bg-gray-800">ADMIN_ADDRESS</code>
          can act here — approving both calls the on-chain registry and records the review.
        </p>

        {!address && (
          <ConnectWalletPrompt className="mt-8" message="Connect the platform admin wallet." />
        )}

        {address && initError && (
          <div className="mt-8">
            <p className="text-red-600 dark:text-red-400">{initError}</p>
            <button
              type="button"
              onClick={retryInit}
              className="mt-3 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Retry
            </button>
          </div>
        )}

        {address && (
          <ApplicationQueue
            applications={data.applications}
            totalApplications={data.totalApplications}
            loading={data.loading}
            loadingMore={data.loadingMore}
            error={data.error}
            statusFilter={data.statusFilter}
            onStatusFilterChange={data.setStatusFilter}
            onLoadMore={data.loadMore}
            review={review}
          />
        )}

        {address && !data.loading && !data.error && (
          <VerifiedNgoList verifiedNgos={data.verifiedNgos} revoke={revoke} />
        )}
      </main>
  );
}
