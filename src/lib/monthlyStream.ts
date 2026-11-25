import { parseAmount, TOKEN_DECIMALS } from './format';

export const SECONDS_PER_MONTH = 30 * 24 * 60 * 60; // 2,592,000 seconds (30 days)

// Maximum i128 allowed on Stellar/Soroban
export const MAX_I128 = (1n << 127n) - 1n;

export interface MonthlyStreamCalculation {
  depositRaw: bigint;
  rateRaw: bigint;
  durationSeconds: number;
  effectiveStreamedRaw: bigint;
  leftoverRaw: bigint;
}

/**
 * Converts a monthly amount and number of months into a total deposit, duration in seconds,
 * and per-second rate.
 *
 * @param monthlyAmount Input string for amount per month (e.g. "50")
 * @param months Number of months
 * @param decimals Token decimals (defaults to 7)
 */
export function calculateMonthlyStream(
  monthlyAmount: string,
  months: number,
  decimals: number = TOKEN_DECIMALS,
): MonthlyStreamCalculation | null {
  if (months <= 0 || !Number.isInteger(months)) {
    return null;
  }

  const monthlyRaw = parseAmount(monthlyAmount, decimals);
  if (monthlyRaw === null || monthlyRaw <= 0n) {
    return null;
  }

  const durationSeconds = months * SECONDS_PER_MONTH;
  const depositRaw = monthlyRaw * BigInt(months);

  // Check overflow against MAX_I128
  if (depositRaw > MAX_I128) {
    return null;
  }

  const rateRaw = depositRaw / BigInt(durationSeconds);
  if (rateRaw <= 0n) {
    return null;
  }

  const effectiveStreamedRaw = rateRaw * BigInt(durationSeconds);
  const leftoverRaw = depositRaw - effectiveStreamedRaw;

  return {
    depositRaw,
    rateRaw,
    durationSeconds,
    effectiveStreamedRaw,
    leftoverRaw,
  };
}
