import { expect, test } from '@playwright/test';

/**
 * LocaleSwitcher writes the NEXT_LOCALE cookie and refreshes the page. The
 * reload checks the cookie is really what request.ts reads back.
 */
test.describe('language switcher', () => {
  test('switching to Spanish survives a reload', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('combobox', { name: /language/i }).selectOption('es');

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dona como un flujo, no como un clic único.',
    );

    await page.reload();

    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Dona como un flujo, no como un clic único.',
    );
  });
});
