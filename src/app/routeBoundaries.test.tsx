import { fireEvent, render, screen } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import GlobalError from './global-error';
import DashboardError from './(main)/dashboard/error';
import DashboardLoading from './(main)/dashboard/loading';
import NgoAdminError from './(main)/ngo-admin/error';
import NgoAdminLoading from './(main)/ngo-admin/loading';
import NgoProfileError from './(main)/ngos/[id]/error';
import NgoProfileLoading from './(main)/ngos/[id]/loading';
import PlatformAdminError from './(main)/platform-admin/error';
import PlatformAdminLoading from './(main)/platform-admin/loading';

const { mockUseErrorReporting } = vi.hoisted(() => ({
  mockUseErrorReporting: vi.fn(),
}));

vi.mock('@/lib/errorReporter', () => ({
  useErrorReporting: (error: Error, boundary: string) => mockUseErrorReporting(error, boundary),
}));

vi.mock('@/components/wallet/WalletProvider', () => ({
  useWallet: () => ({
    address: null,
    connecting: false,
    connect: vi.fn(),
    disconnect: vi.fn(),
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    networkMismatch: false,
  }),
}));

const errorPages = {
  'ngos/[id]': NgoProfileError,
  dashboard: DashboardError,
  'ngo-admin': NgoAdminError,
  'platform-admin': PlatformAdminError,
};

const loadingPages = {
  'ngos/[id]': NgoProfileLoading,
  dashboard: DashboardLoading,
  'ngo-admin': NgoAdminLoading,
  'platform-admin': PlatformAdminLoading,
};

describe('route error boundaries', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockUseErrorReporting.mockClear();
  });

  it.each(Object.entries(errorPages))(
    '%s shows the digest and a working Try again button',
    (_route, ErrorPage) => {
      const reset = vi.fn();
      const error = Object.assign(new Error('boom'), { digest: 'abc123' });

      render(<ErrorPage error={error} reset={reset} />);

      expect(mockUseErrorReporting).toHaveBeenCalledWith(error, 'route');
      expect(screen.getByText('abc123')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
      expect(reset).toHaveBeenCalledTimes(1);
    },
  );

  it('global-error renders its own document with the digest and Try again', () => {
    const error = Object.assign(new Error('boom'), { digest: 'xyz789' });

    // It renders <html>, which can't be mounted inside a test container.
    const html = renderToString(<GlobalError error={error} reset={() => {}} />);

    // Effects don't run during SSR, but the boundary is still wired to the
    // reporter: its effect will run once the fallback hydrates in the browser.
    expect(mockUseErrorReporting).toHaveBeenCalledWith(error, 'global');
    expect(html).toContain('<html');
    expect(html).toContain('xyz789');
    expect(html).toContain('Try again');
  });
});

describe('route loading states', () => {
  it.each(Object.entries(loadingPages))('%s renders a busy #main landmark', (_route, Loading) => {
    const { container } = render(<Loading />);

    expect(container.querySelector('main#main[aria-busy="true"]')).not.toBeNull();
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
  });
});
