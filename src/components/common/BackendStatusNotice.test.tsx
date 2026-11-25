import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithIntl } from '@/test/renderWithIntl';

const getBackendReady = vi.fn<(signal?: AbortSignal) => Promise<boolean>>();

vi.mock('@/lib/api', () => ({
  getBackendReady: (signal?: AbortSignal) => getBackendReady(signal),
}));

import { BACKEND_STATUS_POLL_MS, BackendStatusNotice } from './BackendStatusNotice';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    value: state,
  });
  fireEvent(document, new Event('visibilitychange'));
}

describe('BackendStatusNotice', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
    getBackendReady.mockReset();
    getBackendReady.mockResolvedValue(true);
  });

  afterEach(() => {
    setVisibility('visible');
    vi.useRealTimers();
  });

  it('shows an accessible notice when the readiness probe reports unavailable', async () => {
    getBackendReady.mockResolvedValue(false);
    renderWithIntl(<BackendStatusNotice />);

    // Fake timers are active, so flush the resolved readiness promise through
    // act instead of letting Testing Library's waitFor advance the clock.
    await act(async () => {});

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent(/service is temporarily unavailable/i);
    expect(alert).toHaveTextContent(/problem with your connection/i);
  });

  it('shows nothing while the backend is available', async () => {
    renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('hides the notice after a later check succeeds', async () => {
    getBackendReady.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});
    expect(screen.getByRole('alert')).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS);
    });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(getBackendReady).toHaveBeenCalledTimes(2);
  });

  it('polls at the configured low rate', async () => {
    renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});

    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS - 1);
    });
    expect(getBackendReady).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(getBackendReady).toHaveBeenCalledTimes(2);
  });

  it('stops polling while the tab is hidden and checks immediately on becoming visible', async () => {
    renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});

    setVisibility('hidden');
    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS * 3);
    });
    expect(getBackendReady).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    await act(async () => {});
    expect(getBackendReady).toHaveBeenCalledTimes(2);

    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS);
    });
    expect(getBackendReady).toHaveBeenCalledTimes(3);
  });

  it('does not start a new poll while a previous one is still in flight', async () => {
    getBackendReady.mockImplementation(() => new Promise(() => {}));
    renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});
    const firstSignal = getBackendReady.mock.calls[0][0] as AbortSignal | undefined;

    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS);
    });

    expect(getBackendReady).toHaveBeenCalledTimes(2);
    expect(firstSignal?.aborted).toBe(true);
  });

  it('clears the interval and visibility listener on unmount', async () => {
    const { unmount } = renderWithIntl(<BackendStatusNotice />);
    await act(async () => {});

    unmount();
    await act(async () => {
      vi.advanceTimersByTime(BACKEND_STATUS_POLL_MS * 2);
      setVisibility('visible');
    });

    expect(getBackendReady).toHaveBeenCalledTimes(1);
  });
});
