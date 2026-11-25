'use client';

import { useTranslations } from 'next-intl';

import { useWallet } from '@/components/wallet/WalletProvider';

const WALLET_TROUBLESHOOTING_URL =
  'https://github.com/StreamGive/streamgive-frontend/blob/main/docs/WALLET_TROUBLESHOOTING.md';

/**
 * The "please connect your wallet" card shown in place of a protected
 * page/form's content — dashboard, NGO admin, platform admin, and the
 * donate form all show one differing only in their message. Renders a
 * neutral loading line instead while the wallet session is being restored.
 */
export function ConnectWalletPrompt({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  const t = useTranslations('ConnectWalletPrompt');
  const { connect, connecting } = useWallet();

  // While the provider is still restoring a session the address is null
  // too, so showing the prompt would flash "Connect your wallet" at a user
  // who is about to be connected.
  if (connecting) {
    return (
      <p role="status" className={`text-gray-500 dark:text-gray-400 ${className}`}>
        {t('loading')}
      </p>
    );
  }

  return (
    <div
      className={`rounded-lg border border-gray-200 p-6 text-center dark:border-gray-800 ${className}`}
    >
      <p className="text-gray-600 dark:text-gray-400">{message}</p>
      <button
        type="button"
        onClick={() => void connect()}
        className="mt-4 rounded-md bg-black px-6 py-3 text-sm font-medium text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-gray-200"
      >
        {t('connectWallet')}
      </button>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        <a
          href={WALLET_TROUBLESHOOTING_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-700 dark:hover:text-gray-200"
        >
          {t('troubleConnecting')}
        </a>
      </p>
    </div>
  );
}
