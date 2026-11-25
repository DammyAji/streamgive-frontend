'use client';

import { useTranslations } from 'next-intl';

/** Amber warning badge shown beside a dashboard stream that is close to
 * running out of funds (see isEndingSoon in src/lib/streamEnd.ts). */
export function EndingSoonBadge() {
  const t = useTranslations('Dashboard');

  return (
    <span className="ml-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300">
      {t('endingSoon')}
    </span>
  );
}
