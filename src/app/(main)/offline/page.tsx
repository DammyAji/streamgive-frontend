import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { OfflineView } from '@/components/common/OfflineView';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Offline');
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default function OfflinePage() {
  return <OfflineView />;
}
