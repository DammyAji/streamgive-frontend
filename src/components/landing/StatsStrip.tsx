import { getLocale, getTranslations } from 'next-intl/server';

import { formatAmount } from '@/lib/format';
import { loadPlatformImpact } from '@/lib/impact';

/**
 * Server-rendered proof-of-use strip for the landing page. Shares the
 * impact page's aggregation via loadPlatformImpact rather than duplicating
 * it, and renders nothing when the API is unreachable — a strip showing
 * zeros or an error would undermine the trust it's meant to build.
 */
export async function StatsStrip() {
  const impact = await loadPlatformImpact().catch(() => null);
  if (!impact) return null;
  const locale = await getLocale();
  const t = await getTranslations('StatsStrip');

  const stats = [
    {
      label: t('totalCommitted'),
      value: formatAmount(impact.totalCommitted.toString(), undefined, locale),
    },
    { label: t('activeStreams'), value: impact.activeStreams.toLocaleString(locale) },
    { label: t('verifiedNgos'), value: impact.ngoCount.toLocaleString(locale) },
  ];

  return (
    <section className="border-y border-gray-100 px-6 py-12 sm:px-12">
      <dl className="mx-auto grid max-w-4xl grid-cols-1 gap-8 text-center sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-sm text-gray-500">{stat.label}</dt>
            <dd className="mt-1 text-3xl font-bold">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
