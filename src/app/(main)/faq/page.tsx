import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { FaqAccordion, type FaqItem } from '@/components/faq/FaqAccordion';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('Faq');
  return { title: t('title'), description: t('description') };
}

export default async function FaqPage() {
  const t = await getTranslations('Faq');
  // The questions are a JSON array, so read them with t.raw() rather than
  // running them through ICU formatting.
  const items = t.raw('items') as FaqItem[];

  return (
    <main id="main" className="px-6 py-16 sm:px-12">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{t('description')}</p>
      <div className="mt-8 max-w-2xl">
        <FaqAccordion items={items} />
      </div>
    </main>
  );
}
