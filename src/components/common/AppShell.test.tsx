import { screen } from '@testing-library/react';
import { useEffect } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useToast } from '@/components/toast/ToastProvider';
import { renderWithIntl } from '@/test/renderWithIntl';

let mockPathname = '/';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/components/common/OfflineBanner', () => ({
  OfflineBanner: () => <div>Offline banner</div>,
}));

vi.mock('@/components/common/BackendStatusNotice', () => ({
  BackendStatusNotice: () => <div>Backend status notice</div>,
}));

vi.mock('@/components/wallet/WalletProvider', () => ({
  WalletProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import { AppShell } from './AppShell';

function ShowToastOnMount() {
  const { showToast } = useToast();
  useEffect(() => {
    showToast('info', 'Hello from embed');
  }, [showToast]);
  return null;
}

describe('AppShell', () => {
  it('renders the testnet banner and route-progress chrome on an ordinary route', () => {
    mockPathname = '/ngos';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.getByText(/mode: transactions use test funds/i)).toBeInTheDocument();
  });

  // issue #214: the embed widget is loaded in a partner's iframe, where the
  // testnet banner and route progress bar look broken rather than helpful.
  it('hides the testnet banner on an /embed route', () => {
    mockPathname = '/embed/ngo-1';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.queryByText(/mode: transactions use test funds/i)).not.toBeInTheDocument();
  });

  it('renders the offline banner on an ordinary route', () => {
    mockPathname = '/ngos';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.getByText('Offline banner')).toBeInTheDocument();
  });

  it('hides the offline banner on an /embed route', () => {
    mockPathname = '/embed/ngo-1';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.queryByText('Offline banner')).not.toBeInTheDocument();
  });

  it('renders the backend status notice on an ordinary route', () => {
    mockPathname = '/ngos';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.getByText('Backend status notice')).toBeInTheDocument();
  });

  it('hides the backend status notice on an /embed route', () => {
    mockPathname = '/embed/ngo-1';
    renderWithIntl(<AppShell>{null}</AppShell>);

    expect(screen.queryByText('Backend status notice')).not.toBeInTheDocument();
  });

  it('still provides toast context on /embed without rendering the floating toast host', () => {
    mockPathname = '/embed/ngo-1';
    renderWithIntl(
      <AppShell>
        <ShowToastOnMount />
      </AppShell>,
    );

    expect(screen.queryByText('Hello from embed')).not.toBeInTheDocument();
  });

  it('renders the floating toast host on an ordinary route', () => {
    mockPathname = '/ngos';
    renderWithIntl(
      <AppShell>
        <ShowToastOnMount />
      </AppShell>,
    );

    expect(screen.getByText('Hello from embed')).toBeInTheDocument();
  });
});
