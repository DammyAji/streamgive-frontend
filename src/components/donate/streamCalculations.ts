// Pure helpers for the create-stream form, kept out of the component so the
// maths can be read and tested on its own.

/**
 * Integer division truncates: a deposit that doesn't divide evenly by the
 * duration leaves a remainder the per-second rate can't carry. The deposit is
 * still submitted in full, so the remainder stays in the stream's balance.
 */
export function calculateStreamRate(depositRaw: bigint | null, durationSeconds: number) {
  const rateRaw = depositRaw !== null ? depositRaw / BigInt(durationSeconds) : null;
  const isRateValid = rateRaw !== null && rateRaw > 0n;
  const effectiveStreamedRaw = rateRaw !== null ? rateRaw * BigInt(durationSeconds) : null;
  const leftoverRaw =
    depositRaw !== null && effectiveStreamedRaw !== null ? depositRaw - effectiveStreamedRaw : null;

  return { rateRaw, isRateValid, effectiveStreamedRaw, leftoverRaw };
}

/**
 * The most a donor can put in. For native XLM the account reserve and a fee
 * buffer are held back so the donor can still pay fees.
 */
export function calculateMaxSpendable(
  walletBalance: string | null,
  isNative: boolean,
  nativeReserve: bigint,
): bigint | null {
  if (walletBalance === null) return null;
  const balance = BigInt(walletBalance);
  if (!isNative) return balance;
  return balance > nativeReserve ? balance - nativeReserve : 0n;
}
