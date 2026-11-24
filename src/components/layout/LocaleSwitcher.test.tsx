import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocaleSwitcher, localeCookieString } from './LocaleSwitcher';

const { refresh, intl } = vi.hoisted(() => ({
  refresh: vi.fn(),
  intl: { locale: 'en' },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
}));

vi.mock('next-intl', () => ({
  useLocale: () => intl.locale,
  useTranslations: () => (key: string) => key,
}));

describe('localeCookieString', () => {
  it('sets SameSite=Lax and Secure on HTTPS', () => {
    expect(localeCookieString('es', 'https:')).toBe(
      'NEXT_LOCALE=es; path=/; max-age=31536000; SameSite=Lax; Secure',
    );
  });

  it('sets SameSite=Lax without Secure on HTTP', () => {
    expect(localeCookieString('en', 'http:')).toBe(
      'NEXT_LOCALE=en; path=/; max-age=31536000; SameSite=Lax',
    );
  });
});

describe('LocaleSwitcher', () => {
  beforeEach(() => {
    refresh.mockClear();
    intl.locale = 'en';
    document.cookie = 'NEXT_LOCALE=; path=/; max-age=0';
  });

  afterEach(() => {
    cleanup();
  });

  it('sets the cookie and refreshes the router when a language is chosen', async () => {
    render(<LocaleSwitcher />);

    await userEvent.selectOptions(screen.getByRole('combobox'), 'es');

    expect(document.cookie).toContain('NEXT_LOCALE=es');
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('selects the option matching the active locale', () => {
    intl.locale = 'es';
    render(<LocaleSwitcher />);

    expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('es');
  });
});
