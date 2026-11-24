'use client';

import { useTranslations } from 'next-intl';

export type TokenChoice = 'native' | 'usdc' | 'custom';

const CHOICES: { value: TokenChoice; labelKey: 'nativeToken' | 'usdcToken' | 'customAsset' }[] = [
  { value: 'native', labelKey: 'nativeToken' },
  { value: 'usdc', labelKey: 'usdcToken' },
  { value: 'custom', labelKey: 'customAsset' },
];

export function TokenPicker({
  tokenChoice,
  onTokenChoiceChange,
  customToken,
  onCustomTokenChange,
  isCustomTokenFormatValid,
  isTokenValid,
  decimalsLoading,
  decimalsError,
}: {
  tokenChoice: TokenChoice;
  onTokenChoiceChange: (choice: TokenChoice) => void;
  customToken: string;
  onCustomTokenChange: (value: string) => void;
  isCustomTokenFormatValid: boolean;
  isTokenValid: boolean;
  decimalsLoading: boolean;
  decimalsError: boolean;
}) {
  const t = useTranslations('CreateStreamForm');

  return (
    <fieldset>
      <legend className="text-sm font-medium">{t('token')}</legend>
      <div className="mt-2 flex gap-4 text-sm">
        {CHOICES.map((choice) => (
          <label key={choice.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="token"
              checked={tokenChoice === choice.value}
              onChange={() => onTokenChoiceChange(choice.value)}
            />
            {t(choice.labelKey)}
          </label>
        ))}
      </div>
      {tokenChoice === 'custom' && (
        <>
          <input
            type="text"
            value={customToken}
            onChange={(event) => onCustomTokenChange(event.target.value)}
            placeholder={t('tokenContractAddress')}
            aria-label={t('tokenContractAddress')}
            aria-invalid={!isCustomTokenFormatValid || undefined}
            aria-describedby={!isCustomTokenFormatValid ? 'custom-token-error' : undefined}
            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:ring-teal-400"
          />
          {!isCustomTokenFormatValid && (
            <p id="custom-token-error" className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {t('invalidTokenAddress')}
            </p>
          )}
          {isTokenValid && decimalsLoading && (
            <p role="status" className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {t('checkingTokenDecimals')}
            </p>
          )}
          {isTokenValid && decimalsError && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              {t('tokenDecimalsError')}
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
