import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';

import { getNgo, type NgoProfile } from '@/lib/api';
import { formatAmount } from '@/lib/format';

// Matches MAX_COMPARE in NgoExplorer.
const MAX_COMPARE = 3;

type Props = {
  searchParams: Promise<{ ids?: string }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Explorer');
  return { title: t('compareHeading'), robots: { index: false, follow: false } };
}

export default async function CompareNgosPage({ searchParams }: Props) {
  const t = await getTranslations('Explorer');
  const { ids } = await searchParams;
  const unique = Array.from(new Set((ids ?? '').split(',').filter(Boolean))).slice(0, MAX_COMPARE);

  const results = await Promise.allSettled(unique.map((id) => getNgo(id)));
  const ngos = results
    .filter((r): r is PromiseFulfilledResult<NgoProfile | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((ngo): ngo is NgoProfile => ngo !== null);

  return (
    <main id="main" className="px-6 py-16 sm:px-12">
      <h1 className="text-2xl font-bold">{t('compareHeading')}</h1>
      <Link href="/ngos" className="mt-2 inline-block text-sm underline">
        {t('compareBack')}
      </Link>

      {ngos.length < 2 ? (
        <p className="mt-8 text-gray-600 dark:text-gray-400">{t('compareEmpty')}</p>
      ) : (
        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead>
              <tr>
                <td />
                {ngos.map((ngo) => (
                  <th key={ngo.id} scope="col" className="p-3 font-semibold">
                    <Link href={`/ngos/${ngo.id}`} className="underline">
                      {ngo.name}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-gray-200 dark:border-gray-800">
                <th scope="row" className="p-3 font-medium">{t('verification')}</th>
                {ngos.map((ngo) => (
                  <td key={ngo.id} className="p-3">
                    {ngo.verified ? t('verified') : t('notVerified')}
                  </td>
                ))}
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-800">
                <th scope="row" className="p-3 font-medium">{t('streams')}</th>
                {ngos.map((ngo) => (
                  <td key={ngo.id} className="p-3">{ngo.stats.activeStreamCount}</td>
                ))}
              </tr>
              <tr className="border-t border-gray-200 dark:border-gray-800">
                <th scope="row" className="p-3 font-medium">{t('committed')}</th>
                {ngos.map((ngo) => (
                  <td key={ngo.id} className="p-3">{formatAmount(ngo.stats.totalCommitted)}</td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
