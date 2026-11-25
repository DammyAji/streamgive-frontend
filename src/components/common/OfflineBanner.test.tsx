import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { renderWithIntl } from '@/test/renderWithIntl';

import { OfflineBanner } from './OfflineBanner';

const originalOnline = Object.getOwnPropertyDescriptor(navigator, 'onLine');

function setNavigatorOnline(value: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value });
}

describe('OfflineBanner', () => {
  afterEach(() => {
    if (originalOnline) {
      Object.defineProperty(navigator, 'onLine', originalOnline);
    } else {
      delete (navigator as unknown as { onLine?: boolean }).onLine;
    }
  });

  it('renders an accessible banner when the browser starts offline', () => {
    setNavigatorOnline(false);
    renderWithIntl(<OfflineBanner />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/offline/i);
    expect(alert).toHaveTextContent(/check your connection/i);
  });

  it('renders nothing while the browser is online', () => {
    setNavigatorOnline(true);
    renderWithIntl(<OfflineBanner />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('shows the banner on an offline event and removes it on an online event', () => {
    setNavigatorOnline(true);
    renderWithIntl(<OfflineBanner />);

    fireEvent(window, new Event('offline'));
    expect(screen.getByRole('alert')).toHaveTextContent(/you.re offline/i);

    fireEvent(window, new Event('online'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('stops listening after unmount', () => {
    setNavigatorOnline(true);
    const { unmount } = renderWithIntl(<OfflineBanner />);
    unmount();

    fireEvent(window, new Event('offline'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
