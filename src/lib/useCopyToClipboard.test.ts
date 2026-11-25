import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard', () => {
  const writeText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.status).toBe('idle');
  });

  it('reports copied, then resets to idle after two seconds', async () => {
    writeText.mockResolvedValue(undefined);
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('GABC');
    });
    expect(writeText).toHaveBeenCalledWith('GABC');
    expect(result.current.status).toBe('copied');

    act(() => {
      vi.advanceTimersByTime(1999);
    });
    expect(result.current.status).toBe('copied');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.status).toBe('idle');
  });

  it('reports error when the clipboard write fails', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('GABC');
    });
    expect(result.current.status).toBe('error');

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.status).toBe('idle');
  });

  it('clears the reset timer on unmount', async () => {
    writeText.mockResolvedValue(undefined);
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('GABC');
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
