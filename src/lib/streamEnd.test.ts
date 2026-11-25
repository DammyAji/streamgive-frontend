import { describe, expect, it } from 'vitest';

import { ENDING_SOON_DAYS, isEndingSoon, remainingSeconds } from './streamEnd';

const NOW = Date.parse('2026-01-08T00:00:00.000Z');
// Fresh balances keep the threshold tests focused on the balance/rate math;
// elapsed-time correction gets its own case below.
const UPDATED_AT = '2026-01-08T00:00:00.000Z';
const DAY_SECONDS = 86_400n;

function stream(overrides: Partial<Parameters<typeof isEndingSoon>[0]> = {}) {
  return {
    status: 'ACTIVE' as const,
    balance: (ENDING_SOON_DAYS * 86_400).toString(),
    rate: '1',
    updatedAt: UPDATED_AT,
    ...overrides,
  };
}

describe('remainingSeconds', () => {
  it('accounts for time elapsed since the backend reported the balance', () => {
    const weekOld = '2026-01-01T00:00:00.000Z';
    expect(remainingSeconds(stream({ updatedAt: weekOld }), NOW)).toBe(0n);
    expect(
      remainingSeconds(stream({ balance: (DAY_SECONDS * 8n).toString(), updatedAt: weekOld }), NOW),
    ).toBe(DAY_SECONDS);
    expect(remainingSeconds(stream(), NOW)).toBe(DAY_SECONDS * BigInt(ENDING_SOON_DAYS));
  });

  it('never returns a negative duration', () => {
    const weekOld = '2026-01-01T00:00:00.000Z';
    expect(remainingSeconds(stream({ balance: '10', rate: '1', updatedAt: weekOld }), NOW)).toBe(
      0n,
    );
    expect(remainingSeconds(stream({ updatedAt: '2030-01-01T00:00:00.000Z' }), NOW)).toBe(
      DAY_SECONDS * BigInt(ENDING_SOON_DAYS),
    );
  });

  it('returns 0 for cancelled, drained and unrated streams', () => {
    expect(remainingSeconds(stream({ status: 'CANCELLED' }), NOW)).toBe(0n);
    expect(remainingSeconds(stream({ balance: '0' }), NOW)).toBe(0n);
    expect(remainingSeconds(stream({ rate: '0' }), NOW)).toBe(0n);
  });
});

describe('isEndingSoon', () => {
  it('uses a seven-day default window', () => {
    expect(ENDING_SOON_DAYS).toBe(7);
    // Exactly at the threshold counts as ending soon.
    expect(isEndingSoon(stream(), ENDING_SOON_DAYS, NOW)).toBe(true);
  });

  it('does not flag a stream just outside the default threshold', () => {
    expect(isEndingSoon(stream({ balance: (ENDING_SOON_DAYS * 86_400 + 1).toString() }), ENDING_SOON_DAYS, NOW)).toBe(false);
  });

  it('flags a stream just inside the default threshold', () => {
    expect(isEndingSoon(stream({ balance: (ENDING_SOON_DAYS * 86_400 - 1).toString() }), ENDING_SOON_DAYS, NOW)).toBe(true);
  });

  it('honours a custom threshold, including fractional days', () => {
    const oneDay = stream({ balance: DAY_SECONDS.toString() });
    expect(isEndingSoon(oneDay, 1, NOW)).toBe(true);
    expect(isEndingSoon(oneDay, 0.5, NOW)).toBe(false);
    expect(isEndingSoon(stream({ balance: (DAY_SECONDS / 2n).toString() }), 0.5, NOW)).toBe(true);
  });

  it('never flags cancelled, drained or unrated streams', () => {
    expect(isEndingSoon(stream({ status: 'CANCELLED' }), ENDING_SOON_DAYS, NOW)).toBe(false);
    expect(isEndingSoon(stream({ balance: '0' }), ENDING_SOON_DAYS, NOW)).toBe(false);
    expect(isEndingSoon(stream({ rate: '0' }), ENDING_SOON_DAYS, NOW)).toBe(false);
  });
});
