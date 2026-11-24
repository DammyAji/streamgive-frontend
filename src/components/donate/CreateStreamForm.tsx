'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState, type FormEvent } from 'react';

import { ConnectWalletPrompt } from '@/components/common/ConnectWalletPrompt';
import { useToast } from '@/components/toast/ToastProvider';
import { useWallet } from '@/components/wallet/WalletProvider';
import { ConfirmDonationSummary } from '@/components/donate/ConfirmDonationSummary';
import { RatePreview } from '@/components/donate/RatePreview';
import { calculateMaxSpendable, calculateStreamRate } from '@/components/donate/streamCalculations';
import { TokenPicker, type TokenChoice } from '@/components/donate/TokenPicker';
import { useDonationVaultClient } from '@/lib/donationVaultClient';
import { DURATIONS } from '@/lib/durations';
import {
  formatAmount,
  formatAmountInput,
  formatEstimatedFee,
  getAmountErrorReason,
  parseAmount,
  TOKEN_DECIMALS,
} from '@/lib/format';
import {
  DONATION_VAULT_CONTRACT_ID,
  getNativeAssetAddress,
  getTokenBalance,
  getTokenDecimals,
  getUsdcAssetAddress,
  NATIVE_FEE_RESERVE,
  NETWORK_NAME,
  txToastAction,
} from '@/lib/stellar';
import { DONATION_VAULT_ERRORS } from '@/lib/contractTypes';

// Quick-fill shortcuts for the "Total amount" field, in whichever token is
// currently selected (the field isn't pinned to a single currency, so
// these are unitless multipliers rather than e.g. "$5").
const PRESET_AMOUNTS = [5, 10, 25, 100];
type SubmitState = 'idle' | 'confirming' | 'signing' | 'success' | 'error';

export function CreateStreamForm({
  ngoAddress,
  ngoId,
  ngoName,
}: {
  ngoAddress: string;
  ngoId?: string;
  ngoName?: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('CreateStreamForm');
  const tDuration = useTranslations('Durations');
  const { address, networkMismatch } = useWallet();
  const { client, ready } = useDonationVaultClient();
  const { showToast } = useToast();

  const [tokenChoice, setTokenChoice] = useState<TokenChoice>('native');
  const [customToken, setCustomToken] = useState('');
  const [amount, setAmount] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(DURATIONS[1].seconds);
  const [submitState, setSubmitState] = useState<SubmitState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [streamId, setStreamId] = useState<string | null>(null);
  const [estimatedFee, setEstimatedFee] = useState<string | null>(null);
  // Computed once, at the moment the confirmation step opens (inside the
  // handleSubmit event handler below), rather than derived from Date.now()
  // directly in render — reading the clock during render is an impure,
  // unstable read that can differ across re-renders of the same "confirm
  // this" snapshot.
  const [confirmationEndDate, setConfirmationEndDate] = useState<Date | null>(null);
  const submitButtonRef = useRef<HTMLButtonElement>(null);
  const [balanceRetryKey, setBalanceRetryKey] = useState(0);
  const [decimalsLookup, setDecimalsLookup] = useState<{
    tokenAddress: string;
    decimals: number | null;
  } | null>(null);
  const [balanceLookup, setBalanceLookup] = useState<{
    address: string;
    tokenAddress: string;
    retryKey: number;
    balance: string | null;
    error: boolean;
  } | null>(null);

  const STELLAR_CONTRACT_RE = /^C[A-Z2-7]{55}$/;
  const customTokenTrimmed = customToken.trim();
  const isCustomTokenFormatValid =
    tokenChoice !== 'custom' ||
    customTokenTrimmed.length === 0 ||
    STELLAR_CONTRACT_RE.test(customTokenTrimmed);
  const isTokenValid =
    tokenChoice !== 'custom' ||
    (customTokenTrimmed.length > 0 && STELLAR_CONTRACT_RE.test(customTokenTrimmed));

  // The token address actually being donated in, resolved the same way for
  // both the balance check below and the real create_stream call — null
  // while "Custom asset" is selected but its address isn't valid/complete
  // yet, since there is nothing to look a balance up for in that case.
  const selectedTokenAddress =
    tokenChoice === 'native'
      ? getNativeAssetAddress()
      : tokenChoice === 'usdc'
        ? getUsdcAssetAddress()
        : isCustomTokenFormatValid && customTokenTrimmed.length > 0
          ? customTokenTrimmed
          : null;

  // A result belongs only to the token or wallet request that produced it.
  // A changed selection or retry renders as loading immediately, without an
  // effect first clearing stale state in a second render.
  const currentDecimalsLookup =
    tokenChoice === 'custom' && selectedTokenAddress === decimalsLookup?.tokenAddress
      ? decimalsLookup
      : null;
  const tokenDecimals =
    tokenChoice === 'custom' ? (currentDecimalsLookup?.decimals ?? null) : TOKEN_DECIMALS;
  const decimalsLoading = tokenChoice === 'custom' && selectedTokenAddress !== null && !currentDecimalsLookup;
  const decimalsError = currentDecimalsLookup !== null && currentDecimalsLookup.decimals === null;

  const currentBalanceLookup =
    address &&
    selectedTokenAddress &&
    balanceLookup?.address === address &&
    balanceLookup.tokenAddress === selectedTokenAddress &&
    balanceLookup.retryKey === balanceRetryKey
      ? balanceLookup
      : null;
  const walletBalance = currentBalanceLookup?.balance ?? null;
  const balanceLoading = Boolean(address && selectedTokenAddress && !currentBalanceLookup);
  const balanceError = currentBalanceLookup?.error ?? false;

  const depositRaw = parseAmount(amount, tokenDecimals ?? TOKEN_DECIMALS);
  const isAmountValid = depositRaw !== null;
  const amountErrorReason = getAmountErrorReason(amount, tokenDecimals ?? TOKEN_DECIMALS);
  const amountError =
    amountErrorReason === 'precision'
      ? t('amountErrorPrecision', { decimals: tokenDecimals ?? TOKEN_DECIMALS })
      : amountErrorReason === 'invalid'
        ? t('amountErrorInvalid')
        : amountErrorReason === 'nonPositive'
          ? t('amountErrorNonPositive')
          : null;

  // Integer division truncates: a deposit that doesn't divide evenly by the
  // duration leaves a remainder the per-second rate can't carry (issue
  // #156). The deposit itself is still submitted in full -- the contract
  // has no partial-deposit call -- so that remainder sits in the stream's
  // balance until cancel/top-up rather than ever actually streaming out.
  // Surfaced below so the donor sees the real effective total up front
  // instead of only discovering the dust on cancel.
  const { rateRaw, isRateValid, effectiveStreamedRaw, leftoverRaw } = calculateStreamRate(
    depositRaw,
    durationSeconds,
  );

  // For native XLM, reserve 1 XLM base account reserve + 0.1 XLM estimated fee buffer
  // so donors cannot deposit funds needed to cover transaction fees and minimum reserve.
  const maxSpendableRaw = calculateMaxSpendable(
    walletBalance,
    tokenChoice === 'native',
    NATIVE_FEE_RESERVE,
  );

  const insufficientBalance =
    maxSpendableRaw !== null && depositRaw !== null && depositRaw > maxSpendableRaw;


  const canSubmit =
    !networkMismatch &&
    isAmountValid &&
    isRateValid &&
    isTokenValid &&
    !insufficientBalance &&
    !decimalsLoading &&
    !decimalsError &&
    submitState !== 'signing' &&
    submitState !== 'confirming' &&
    ready;

  // Looks up the real decimals for a custom token (issue #204) — native XLM
  // and USDC are both Stellar Asset Contracts, which are always 7, so only
  // the 'custom' path needs a network round trip. Runs on selectedTokenAddress
  // rather than customToken directly so a half-typed address (still failing
  // the StrKey format check) doesn't fire a lookup against a non-address.
  useEffect(() => {
    if (tokenChoice !== 'custom' || !selectedTokenAddress) return;

    let cancelled = false;
    getTokenDecimals(selectedTokenAddress)
      .then((decimals) => {
        if (!cancelled) setDecimalsLookup({ tokenAddress: selectedTokenAddress, decimals });
      })
      .catch(() => {
        if (!cancelled) setDecimalsLookup({ tokenAddress: selectedTokenAddress, decimals: null });
      });

    return () => {
      cancelled = true;
    };
  }, [tokenChoice, selectedTokenAddress]);

  useEffect(() => {
    if (!address || !selectedTokenAddress) return;

    let cancelled = false;
    getTokenBalance(selectedTokenAddress, address)
      .then((balance) => {
        if (!cancelled) {
          setBalanceLookup({
            address,
            tokenAddress: selectedTokenAddress,
            retryKey: balanceRetryKey,
            balance,
            error: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBalanceLookup({
            address,
            tokenAddress: selectedTokenAddress,
            retryKey: balanceRetryKey,
            balance: null,
            error: true,
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [address, selectedTokenAddress, balanceRetryKey]);

  const durationLabel = tDuration(`seconds${durationSeconds}`);

  function handleTokenChoiceChange(choice: TokenChoice): void {
    setTokenChoice(choice);
    setDecimalsLookup(null);
    setBalanceLookup(null);
  }

  function handleCustomTokenChange(value: string): void {
    setCustomToken(value);
    setDecimalsLookup(null);
    setBalanceLookup(null);
  }

  function handleMaxClick(): void {
    if (maxSpendableRaw === null || maxSpendableRaw <= 0n) {
      return;
    }
    setAmount(formatAmountInput(maxSpendableRaw, tokenDecimals ?? TOKEN_DECIMALS));
  }

  // Intercepts the flow before the contract call: pressing "Review & Sign"

  // only opens the confirmation summary. The actual create_stream call
  // (previously fired straight from here) now lives in handleConfirm,
  // gated behind that extra step so a donor sees NGO/token/amount/rate/end
  // date before their wallet ever prompts for a signature.
  function handleSubmit(event: FormEvent): void {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }
    setConfirmationEndDate(new Date(Date.now() + durationSeconds * 1000));
    setSubmitState('confirming');
  }

  function handleCancelConfirmation(): void {
    setSubmitState('idle');
    // Restore focus to the submit button after React re-enables it.
    // requestAnimationFrame defers until after the state flush so the button
    // is no longer disabled when focus lands on it.
    requestAnimationFrame(() => {
      submitButtonRef.current?.focus();
    });
  }

  async function handleConfirm(): Promise<void> {
    if (
      networkMismatch ||
      !address ||
      !client ||
      !selectedTokenAddress ||
      depositRaw === null ||
      rateRaw === null
    ) {
      return;
    }

    setSubmitState('signing');
    setErrorMessage(null);
    setEstimatedFee(null);

    try {
      const tx = await client.create_stream({
        donor: address,
        ngo: ngoAddress,
        token: selectedTokenAddress,
        deposit: depositRaw,
        rate: rateRaw,
      });

      // Client.create_stream already simulated the call to assemble this
      // transaction, so the fee estimate is ready here — shown before
      // signAndSend() goes on to trigger the wallet's signing prompt.
      setEstimatedFee(formatEstimatedFee(tx.built?.fee));

      const sent = await tx.signAndSend();
      const newStreamId = String(sent?.result ?? '');

      setStreamId(newStreamId);
      setSubmitState('success');
      showToast(
        'success',
        t('streamCreatedToast', { streamId: newStreamId }),
        txToastAction(sent, tx),
      );
      setAmount('');
      setDurationSeconds(DURATIONS[1].seconds);
      handleTokenChoiceChange('native');
      setCustomToken('');
      if (ngoId) {
        router.push(`/ngos/${ngoId}/donate/success?streamId=${newStreamId}`);
      }
    } catch (err) {
      const rawError = err instanceof Error ? err.message : String(err);
      const contractCode = Number(/Error\(Contract,\s*#(\d+)\)/.exec(rawError)?.[1]);
      const knownContractError = Object.values(DONATION_VAULT_ERRORS).some(
        (code) => code === contractCode,
      );
      setErrorMessage(
        knownContractError ? t(`contractError${contractCode}`) : t('transactionFailed'),
      );
      setSubmitState('error');
    } finally {
      setEstimatedFee(null);
    }
  }

  if (!DONATION_VAULT_CONTRACT_ID) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 dark:border-amber-800 dark:bg-amber-950">
        <p className="font-medium text-amber-800 dark:text-amber-300">{t('widgetNotConfigured')}</p>
        <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
          {t('missingContract', { variable: 'NEXT_PUBLIC_DONATION_VAULT_CONTRACT_ID' })}
        </p>
      </div>
    );
  }

  // We no longer return early here, as the user might want to create another stream.

  if (!address) {
    return <ConnectWalletPrompt message={t('connectWallet')} />;
  }

  return (
    <div className="space-y-8">
      {submitState === 'success' && streamId !== null && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6 dark:border-green-900 dark:bg-green-950">
          <p className="font-medium text-green-800 dark:text-green-300">{t('streamStarted')}</p>
          <p className="mt-1 text-sm text-green-700 dark:text-green-400">
            {t('streamActive', { streamId })}
          </p>
        </div>
      )}

      <form onSubmit={(event) => void handleSubmit(event)} className="max-w-md space-y-6">
      <TokenPicker
        tokenChoice={tokenChoice}
        onTokenChoiceChange={handleTokenChoiceChange}
        customToken={customToken}
        onCustomTokenChange={handleCustomTokenChange}
        isCustomTokenFormatValid={isCustomTokenFormatValid}
        isTokenValid={isTokenValid}
        decimalsLoading={decimalsLoading}
        decimalsError={decimalsError}
      />

      <div className="block">
        <label htmlFor="amount" className="text-sm font-medium">{t('totalAmount')}</label>
        <input
          id="amount"
          type="number"
          min="0"
          step="any"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          placeholder="100"
          aria-invalid={amountError !== null || (isAmountValid && !isRateValid) || undefined}
          aria-describedby={
            amountError !== null
              ? 'amount-format-error'
              : isAmountValid && !isRateValid
                ? 'amount-error'
                : undefined
          }
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:ring-teal-400"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setAmount(String(preset))}
              aria-label={t('setAmountTo', { amount: preset })}
              className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:hover:bg-gray-800 dark:focus-visible:ring-teal-400"
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={handleMaxClick}
            disabled={maxSpendableRaw === null || maxSpendableRaw <= 0n}
            aria-label={t('setAmountToMax')}
            className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-800 dark:focus-visible:ring-teal-400"
          >
            {t('max')}
          </button>
        </div>

        {amountError !== null && (
          <p id="amount-format-error" className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {amountError}
          </p>
        )}
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {balanceLoading
            ? t('checkingWalletBalance')
            : walletBalance !== null
              ? t('walletBalance', {
                  amount: formatAmount(walletBalance, tokenDecimals ?? TOKEN_DECIMALS, locale),
                })
              : null}
        </p>
        {balanceError && (
          <p className="mt-1 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            {t('balanceError')}
            <button
              type="button"
              onClick={() => setBalanceRetryKey((key) => key + 1)}
              className="font-medium underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:focus-visible:ring-teal-400"
            >
              {t('retry')}
            </button>
          </p>
        )}
        {insufficientBalance && (
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
            {t('insufficientBalance')}
          </p>
        )}
      </div>

      <label className="block">
        <span className="text-sm font-medium">{t('streamOver')}</span>
        <select
          value={durationSeconds}
          onChange={(event) => setDurationSeconds(Number(event.target.value))}
          className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 dark:border-gray-700 dark:bg-gray-900 dark:focus-visible:ring-teal-400"
        >
          {DURATIONS.map((d) => (
            <option key={d.seconds} value={d.seconds}>
              {tDuration(`seconds${d.seconds}`)}
            </option>
          ))}
        </select>
      </label>

      <RatePreview
        isAmountValid={isAmountValid}
        isRateValid={isRateValid}
        rateRaw={rateRaw}
        effectiveStreamedRaw={effectiveStreamedRaw}
        leftoverRaw={leftoverRaw}
        decimals={tokenDecimals ?? TOKEN_DECIMALS}
      />

      {submitState === 'signing' && estimatedFee && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('estimatedFee', { fee: estimatedFee })}
        </p>
      )}

      {submitState === 'error' && errorMessage && (
        <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
      )}

      {networkMismatch && submitState !== 'confirming' && (
        <p role="alert" className="text-sm text-amber-700 dark:text-amber-400">
          {t('networkMismatch', { network: NETWORK_NAME })}
        </p>
      )}

      <button
        type="submit"
        ref={submitButtonRef}
        disabled={!canSubmit}
        className="w-full rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200 dark:focus-visible:ring-teal-400"
      >
        {submitState === 'signing'
          ? t('confirmInWallet')
          : submitState === 'confirming'
            ? t('reviewing')
            : !ready
              ? t('preparingContract')
              : decimalsLoading
                ? t('checkingToken')
                : t('reviewAndSign')}
      </button>

      {submitState === 'confirming' && confirmationEndDate && (
        <ConfirmDonationSummary
          ngoLabel={ngoName ?? ngoAddress}
          tokenLabel={t(
            tokenChoice === 'native'
              ? 'nativeToken'
              : tokenChoice === 'usdc'
                ? 'usdcToken'
                : 'customAsset',
          )}
          amount={amount}
          rateRaw={rateRaw}
          decimals={tokenDecimals ?? TOKEN_DECIMALS}
          durationLabel={durationLabel}
          effectiveEndDate={confirmationEndDate}
          networkMismatch={networkMismatch}
          onConfirm={() => void handleConfirm()}
          onCancel={handleCancelConfirmation}
        />
      )}
    </form>
    </div>
  );
}
