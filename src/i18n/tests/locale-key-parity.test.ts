
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { LOCALES } from '../config';

const messagesDirectory = join(process.cwd(), 'messages');
const referenceLocale = 'en';

type TranslationMessages = Record<string, unknown>;

function flattenKeys(
  messages: TranslationMessages,
  prefix = '',
): string[] {
  return Object.entries(messages).flatMap(([key, value]) => {
    const currentKey = prefix ? `${prefix}.${key}` : key;

    if (
      value !== null &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      return flattenKeys(value as TranslationMessages, currentKey);
    }

    return [currentKey];
  });
}

function loadLocale(locale: string): TranslationMessages {
  const filePath = join(messagesDirectory, `${locale}.json`);

  return JSON.parse(readFileSync(filePath, 'utf8')) as TranslationMessages;
}

function getSortedKeys(messages: TranslationMessages): string[] {
  return flattenKeys(messages).sort();
}

describe('locale key parity', () => {
  const referenceMessages = loadLocale(referenceLocale);
  const referenceKeys = getSortedKeys(referenceMessages);

  const localeFiles = readdirSync(messagesDirectory)
    .filter((file) => file.endsWith('.json'))
    .map((file) => file.replace(/\.json$/, ''))
    .filter((locale) => locale !== referenceLocale && (LOCALES as readonly string[]).includes(locale))
    .sort();

  it('ensures every locale has exactly the same keys as en.json', () => {
    const failures: string[] = [];

    for (const locale of localeFiles) {
      const localeMessages = loadLocale(locale);
      const localeKeys = getSortedKeys(localeMessages);

      const missingKeys = referenceKeys.filter(
        (key) => !localeKeys.includes(key),
      );

      const extraKeys = localeKeys.filter(
        (key) => !referenceKeys.includes(key),
      );

      if (missingKeys.length > 0 || extraKeys.length > 0) {
        failures.push(
          [
            `Locale: ${locale}.json`,
            missingKeys.length > 0
              ? `Missing keys:\n${missingKeys.map((key) => `  - ${key}`).join('\n')}`
              : '',
            extraKeys.length > 0
              ? `Extra keys:\n${extraKeys.map((key) => `  - ${key}`).join('\n')}`
              : '',
          ]
            .filter(Boolean)
            .join('\n',
            ),
        );
      }
    }

    expect(
      failures,
      failures.length > 0
        ? `Translation key parity failed:\n\n${failures.join('\n\n')}`
        : undefined,
    ).toEqual([]);
  });
});
