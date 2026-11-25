import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getTranslations } from 'next-intl/server';

import { CreateStreamForm } from '@/components/donate/CreateStreamForm';
import { EmbedAutoResizer } from '@/components/embed/EmbedAutoResizer';
import { getNgo, type NgoProfile } from '@/lib/api';
import { resolveEmbedLocale } from '@/i18n/embed';

type Props = {
  params: Promise<{ ngoId: string }>;
  searchParams: Promise<{ locale?: string | string[] }>;
};

// noindex: this is a widget meant to live inside someone else's iframe,
// not a page anyone should land on directly from search.
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { ngoId } = await params;
  const locale = resolveEmbedLocale((await searchParams).locale);
  const t = await getTranslations({ locale, namespace: 'EmbedWidget' });
  const ngo = await getNgo(ngoId).catch(() => null);
  return {
    title: ngo ? t('donateTitle', { ngoName: ngo.name }) : t('notFoundTitle'),
    robots: { index: false, follow: false },
  };
}

// Deliberately no <Header>/<Footer> — this route is meant to be loaded in
// an <iframe> on a third-party (NGO's own) site, not visited directly.
export default async function EmbedDonatePage({ params, searchParams }: Props) {
  const { ngoId } = await params;
  // The embedding page may pass `?locale=es`; anything else falls back to English.
  const locale = resolveEmbedLocale((await searchParams).locale);
  const t = await getTranslations({ locale, namespace: 'EmbedWidget' });
  const messages = (await import(`../../../../messages/${locale}.json`)).default;

  let ngo: NgoProfile | null;
  try {
    ngo = await getNgo(ngoId);
  } catch {
    return (
      <EmbedAutoResizer>
        <main id="main" className="p-6 text-center text-sm text-red-600 dark:text-red-400">
          {t('loadError')}
        </main>
      </EmbedAutoResizer>
    );
  }

  // notFound() works by throwing, so it has to stay outside the try/catch
  // above or the catch would swallow it and show the API error instead.
  if (!ngo) {
    notFound();
  }

  const ngoName = ngo.name;
  const ngoAddress = ngo.ownerAddress;

  if (!ngo.verified) {
    return (
      <main id="main" className="mx-auto max-w-sm p-6 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">{t('notVerified', { ngoName })}</p>
      </main>
    );
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <EmbedAutoResizer>
        <main id="main" className="mx-auto max-w-sm p-6">
          <h1 className="text-lg font-bold">{t('heading', { ngoName })}</h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('poweredBy')}</p>
          <div className="mt-6">
            <CreateStreamForm ngoAddress={ngoAddress} ngoName={ngoName} />
          </div>
        </main>
      </EmbedAutoResizer>
    </NextIntlClientProvider>
  );
}
