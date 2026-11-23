import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import * as ApiMod from '@/lib/api';
import type { Withdrawal } from '@/lib/api';

import { WithdrawalHistory } from './WithdrawalHistory';
import { renderWithLocale as render } from '../../../test/renderWithLocale';

vi.mock('@/lib/api', () => ({
  getWithdrawals: vi.fn(),
}));

function makeWithdrawal(overrides: Partial<Withdrawal> = {}): Withdrawal {
  return {
    id: 'w1',
    streamId: '42',
    amount: '1000000000', // 100.0
    createdAt: '2026-01-15T00:00:00.000Z',
    ...overrides,
  };
}

describe('WithdrawalHistory', () => {
  it('shows date, stream id, and net amount for each withdrawal', async () => {
    vi.spyOn(ApiMod, 'getWithdrawals').mockResolvedValue([
      makeWithdrawal({ id: 'w1', streamId: '42', amount: '1000000000' }),
    ]);

    render(<WithdrawalHistory ngoId="ngo-1" />);

    expect(await screen.findByText('#42')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText(new Date('2026-01-15T00:00:00.000Z').toLocaleString('en'))).toBeInTheDocument();
  });

  it('shows an empty state when there are no withdrawals yet', async () => {
    vi.spyOn(ApiMod, 'getWithdrawals').mockResolvedValue([]);

    render(<WithdrawalHistory ngoId="ngo-1" />);

    expect(await screen.findByText('No withdrawals yet.')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    vi.spyOn(ApiMod, 'getWithdrawals').mockRejectedValue(new Error('network error'));

    render(<WithdrawalHistory ngoId="ngo-1" />);

    expect(await screen.findByText(/couldn't load withdrawal history/i)).toBeInTheDocument();
  });

  it('re-fetches when ngoId changes', async () => {
    const getWithdrawalsMock = vi.spyOn(ApiMod, 'getWithdrawals').mockResolvedValue([]);

    const { rerender } = render(<WithdrawalHistory ngoId="ngo-1" />);
    await screen.findByText('No withdrawals yet.');
    expect(getWithdrawalsMock).toHaveBeenCalledWith('ngo-1', expect.anything());

    rerender(<WithdrawalHistory ngoId="ngo-2" />);
    await screen.findByText('No withdrawals yet.');
    expect(getWithdrawalsMock).toHaveBeenCalledWith('ngo-2', expect.anything());
  });

  it('hides Export CSV when there is no history to export', async () => {
    vi.spyOn(ApiMod, 'getWithdrawals').mockResolvedValue([]);

    render(<WithdrawalHistory ngoId="ngo-1" />);
    await screen.findByText('No withdrawals yet.');

    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('downloads every withdrawal as a CSV when Export CSV is clicked', async () => {
    const user = userEvent.setup();
    vi.spyOn(ApiMod, 'getWithdrawals').mockResolvedValue([
      makeWithdrawal({ id: 'w1', streamId: '42', amount: '1000000000' }),
    ]);
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:withdrawals');
    URL.createObjectURL = createObjectURL;
    URL.revokeObjectURL = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    try {
      render(<WithdrawalHistory ngoId="ngo-1" />);
      await user.click(await screen.findByRole('button', { name: 'Export CSV' }));

      expect(click).toHaveBeenCalledTimes(1);
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blob = createObjectURL.mock.calls[0][0];
      expect(blob.type).toBe('text/csv;charset=utf-8;');
      const text = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsText(blob);
      });
      expect(text.split('\n')).toEqual([
        'Date,Stream ID,Amount',
        '2026-01-15T00:00:00.000Z,42,100',
      ]);
    } finally {
      URL.createObjectURL = originalCreate;
      URL.revokeObjectURL = originalRevoke;
      click.mockRestore();
    }
  });
});
