import { DEFAULT_LOCALE, isLocale, type Locale } from './config';

/**
 * Picks the locale for the embeddable donate widget from the optional
 * `?locale=` query parameter the embedding page can pass. Anything missing,
 * repeated or unsupported falls back to English, so a bad value never
 * breaks the iframe.
 */
export function resolveEmbedLocale(value: string | string[] | undefined): Locale {
  const candidate = Array.isArray(value) ? value[0] : value;
  return isLocale(candidate) ? candidate : DEFAULT_LOCALE;
}
