import { describe, expect, it } from 'vitest';

import {
  calculateMonthlyStream,
  MAX_I128,
  SECONDS_PER_MONTH,
} from './monthlyStream';

describe('calculateMonthlyStream', () => {
  it('converts monthly amount and duration into deposit and rate', () => {
    // 100 tokens/month for 3 months = 300 tokens total
    const result = calculateMonthlyStream('100', 3, 7);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.durationSeconds).toBe(3 * SECONDS_PER_MONTH);
    expect(result.depositRaw).toBe(300n * 10n ** 7n);
    // Rate: 300 * 10^7 / (3 * 2,592,000) = 385 stroops/sec
    expect(result.rateRaw).toBe(result.depositRaw / BigInt(result.durationSeconds));
  });

  it('accurately calculates integer division rounding remainders', () => {
    // 10 tokens for 1 month: 100,000,000 / 2,592,000 = 38 stroops/sec
    const result = calculateMonthlyStream('10', 1, 7);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.rateRaw).toBe(38n);
    expect(result.effectiveStreamedRaw).toBe(38n * BigInt(SECONDS_PER_MONTH));
    expect(result.leftoverRaw).toBe(result.depositRaw - result.effectiveStreamedRaw);
    expect(result.leftoverRaw).toBeGreaterThan(0n);
    expect(result.leftoverRaw).toBeLessThan(BigInt(SECONDS_PER_MONTH));
  });

  it('handles largest allowed values within i128 range without overflow', () => {
    // A huge amount near MAX_I128
    // MAX_I128 is ~1.7e38 base units. In 7 decimals, ~1.7e31 tokens.
    const maxTokens = '10000000000000000000000'; // 10^22 tokens
    const result = calculateMonthlyStream(maxTokens, 12, 7);
    expect(result).not.toBeNull();
    if (!result) return;

    expect(result.depositRaw).toBeLessThanOrEqual(MAX_I128);
    expect(result.rateRaw).toBeGreaterThan(0n);
  });

  it('rejects values that exceed MAX_I128', () => {
    // 10^33 tokens * 10^7 = 10^40 > MAX_I128
    const hugeAmount = '1000000000000000000000000000000000';
    const result = calculateMonthlyStream(hugeAmount, 10, 7);
    expect(result).toBeNull();
  });

  it('rejects non-positive months or invalid inputs', () => {
    expect(calculateMonthlyStream('100', 0)).toBeNull();
    expect(calculateMonthlyStream('100', -1)).toBeNull();
    expect(calculateMonthlyStream('100', 1.5)).toBeNull();
    expect(calculateMonthlyStream('', 1)).toBeNull();
    expect(calculateMonthlyStream('-5', 1)).toBeNull();
    expect(calculateMonthlyStream('abc', 1)).toBeNull();
  });

  it('returns null when monthly amount is too small to sustain 1 base unit per second', () => {
    // 0.0001 tokens = 1,000 stroops for 2,592,000 seconds -> 0 stroops/sec
    const result = calculateMonthlyStream('0.0001', 1, 7);
    expect(result).toBeNull();
  });
});
