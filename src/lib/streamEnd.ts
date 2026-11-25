import type { Stream } from './api';

const SECONDS_PER_DAY = 86_400n;

/** Default warning window: flag streams with at most a week of funds left. */
export const ENDING_SOON_DAYS = 7;

type StreamFunds = Pick<Stream, 'status' | 'balance' | 'rate' | 'updatedAt'>;

/**
 * How many seconds the stream's remaining balance will last at its current
 * rate, accounting for the time that has passed since the backend last
 * reported the balance (the same correction the dashboard's live balance
 * uses). Returns 0 when the stream is cancelled, drained or has no rate.
 *
 * `now` is injectable so the threshold can be tested without fake timers.
 */
export function remainingSeconds(stream: StreamFunds, now: number = Date.now()): bigint {
  if (stream.status !== 'ACTIVE') {
    return 0n;
  }
  const balance = BigInt(stream.balance);
  const rate = BigInt(stream.rate);
  if (balance <= 0n || rate <= 0n) {
    return 0n;
  }

  const elapsedMs = Math.max(0, now - new Date(stream.updatedAt).getTime());
  const remainingRaw = balance - rate * BigInt(Math.floor(elapsedMs / 1000));
  return remainingRaw > 0n ? remainingRaw / rate : 0n;
}

/**
 * Whether an active stream should show an "Ending soon" badge. The window is
 * configurable via `thresholdDays` (fractional days are allowed) and defaults
 * to ENDING_SOON_DAYS. Cancelled, drained and unrated streams are never
 * flagged — there is no estimated end to warn about.
 */
export function isEndingSoon(
  stream: StreamFunds,
  thresholdDays: number = ENDING_SOON_DAYS,
  now: number = Date.now(),
): boolean {
  if (stream.status !== 'ACTIVE') {
    return false;
  }
  const balance = BigInt(stream.balance);
  const rate = BigInt(stream.rate);
  if (balance <= 0n || rate <= 0n) {
    return false;
  }

  const thresholdSeconds = BigInt(Math.round(thresholdDays * Number(SECONDS_PER_DAY)));
  return remainingSeconds(stream, now) <= thresholdSeconds;
}
