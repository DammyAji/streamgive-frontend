import { describe, expect, it } from 'vitest';

import { resolveEmbedLocale } from './embed';

describe('resolveEmbedLocale', () => {
  it('uses a supported locale passed by the embedding page', () => {
    expect(resolveEmbedLocale('es')).toBe('es');
  });

  it('falls back to English when the parameter is missing or unsupported', () => {
    expect(resolveEmbedLocale(undefined)).toBe('en');
    expect(resolveEmbedLocale('xx')).toBe('en');
    expect(resolveEmbedLocale('')).toBe('en');
  });

  it('uses the first value when the parameter is repeated', () => {
    expect(resolveEmbedLocale(['es', 'en'])).toBe('es');
  });
});
