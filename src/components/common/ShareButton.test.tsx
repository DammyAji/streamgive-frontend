import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ShareButton } from './ShareButton';

describe('ShareButton', () => {
  const originalUrl = window.location.href;
  const originalShare = (navigator as unknown as { share?: unknown }).share;
  const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalUrl);
    if (originalShare) {
      Object.defineProperty(navigator, 'share', { configurable: true, value: originalShare });
    } else {
      Reflect.deleteProperty(navigator, 'share');
    }

    if (originalClipboard) {
      Object.defineProperty(navigator, 'clipboard', originalClipboard);
    } else {
      Reflect.deleteProperty(navigator, 'clipboard');
    }
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  describe('Web Share API path', () => {
    it('uses navigator.share when available and invokes it with title and url', async () => {
      const mockShare = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: mockShare,
      });

      render(<ShareButton title="Test NGO" ariaLabel="Share Test NGO" />);

      const button = screen.getByRole('button', { name: 'Share Test NGO' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Share');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockShare).toHaveBeenCalledWith({
        title: 'Test NGO',
        text: undefined,
        url: window.location.href,
      });
    });

    it('handles AbortError quietly when user cancels the share sheet', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';
      const mockShare = vi.fn().mockRejectedValue(abortError);
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: mockShare,
      });

      render(<ShareButton title="Test NGO" />);
      const button = screen.getByRole('button', { name: 'Share' });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockShare).toHaveBeenCalled();
      // Should not fall back or show error
      expect(button).toHaveTextContent('Share');
    });

    it('falls back to clipboard copy if navigator.share throws an unexpected error', async () => {
      const mockShare = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const mockWriteText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        configurable: true,
        value: mockShare,
      });
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: mockWriteText },
      });

      render(<ShareButton title="Test NGO" />);
      const button = screen.getByRole('button', { name: 'Share' });

      await act(async () => {
        fireEvent.click(button);
      });

      expect(mockShare).toHaveBeenCalled();
      expect(mockWriteText).toHaveBeenCalledWith(window.location.href);
    });
  });

  describe('Fallback copy button path', () => {
    beforeEach(() => {
      Reflect.deleteProperty(navigator, 'share');
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: vi.fn().mockResolvedValue(undefined) },
      });
    });

    it('falls back to copy button when navigator.share does not exist', async () => {
      render(<ShareButton path="/ngos/ngo-455" ariaLabel="Copy profile link" />);

      const button = screen.getByRole('button', { name: 'Copy profile link' });
      expect(button).toBeInTheDocument();
      expect(button).toHaveTextContent('Copy link');

      await act(async () => {
        fireEvent.click(button);
      });

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        `${window.location.origin}/ngos/ngo-455`
      );
      expect(screen.getByRole('button', { name: 'Link copied!' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent('Link copied to clipboard.');

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(screen.getByRole('button', { name: 'Copy profile link' })).toHaveTextContent('Copy link');
    });

    it('shows error state when clipboard copy fails', async () => {
      vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard denied'));
      render(<ShareButton />);

      const button = screen.getByRole('button', { name: 'Copy link' });
      await act(async () => {
        fireEvent.click(button);
      });

      expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument();
      expect(screen.getByRole('status')).toHaveTextContent(
        'Could not copy the link. Copy it from the address bar instead.'
      );
    });
  });
});
