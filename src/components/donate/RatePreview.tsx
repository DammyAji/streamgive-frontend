'use client';

import { useLocale, useTranslations } from 'next-intl';

import { formatAmount, formatRate } from '@/lib/format';

export function RatePreview({
  isAmountValid,
  isRateValid,
  rateRaw,
  effectiveStreamedRaw,
  leftoverRaw,
  decimals,
}: {
  isAmountValid: boolean;
  isRateValid: boolean;
  rateRaw: bigint | null;
  effectiveStreamedRaw: bigint | null;
  leftoverRaw: bigint | null;
  decimals: number;
}) {
  const locale = useLocale();
  const t = useTranslations('CreateStreamForm');

  return (
    <>
      {isAmountValid && rateRaw !== null && (
        <p id={!isRateValid ? 'amount-error' : undefined} className="text-sm text-gray-500 dark:text-gray-400">
          {isRateValid ? t('estimatedRate', { rate: formatRate(rateRaw, decimals) }) : t('rateTooLow')}
        </p>
      )}

      {isRateValid && leftoverRaw !== null && leftoverRaw > 0n && effectiveStreamedRaw !== null && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          {t('streamRemainder', {
            streamed: formatAmount(effectiveStreamedRaw.toString(), decimals, locale),
            remaining: formatAmount(leftoverRaw.toString(), decimals, locale),
          })}
        </p>
      )}
    </>
  );
}
