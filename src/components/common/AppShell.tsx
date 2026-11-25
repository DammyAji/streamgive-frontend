'use client';

import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';

import { BackendStatusNotice } from '@/components/common/BackendStatusNotice';
import { EnvironmentBanner } from '@/components/common/EnvironmentBanner';
import { OfflineBanner } from '@/components/common/OfflineBanner';
import { RouteProgressBar } from '@/components/common/RouteProgressBar';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { WalletProvider } from '@/components/wallet/WalletProvider';

/**
 * Wraps every route with the app's persistent chrome (offline banner,
 * backend status notice, testnet banner, route progress bar, toast host)
 * and the wallet/toast providers -- except on `/embed/*`, which is meant to
 * be loaded in an `<iframe>` on a partner's own site (issue #214). Those banners eat
 * vertical space and the fixed-position progress bar/toast host look broken
 * inside a small, auto-resized widget, so they are skipped there.
 * `WalletProvider`
 * and `ToastProvider`'s context still wrap the embed route's children --
 * only the host chrome around it is conditional -- since the embed donate
 * form depends on both.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith('/embed') ?? false;

  return (
    <>
      {!isEmbed && <OfflineBanner />}
      {!isEmbed && <BackendStatusNotice />}
      {!isEmbed && <EnvironmentBanner />}
      {!isEmbed && (
        // RouteProgressBar reads useSearchParams(), which requires a
        // Suspense boundary — see NgoExplorer's own use of this pattern.
        <Suspense fallback={null}>
          <RouteProgressBar />
        </Suspense>
      )}
      <ToastProvider hideHost={isEmbed}>
        <WalletProvider>{children}</WalletProvider>
      </ToastProvider>
    </>
  );
}
