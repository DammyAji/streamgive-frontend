import { expect, test } from '@playwright/test';

/**
 * The privacy and terms pages are only reachable from the footer, so a broken
 * route would otherwise go unnoticed until a visitor hit it.
 */
const LEGAL_PAGES = [
  {
    footerLink: 'Privacy',
    url: /\/privacy$/,
    heading: 'Privacy Policy',
    paragraph: /published a privacy policy yet/i,
  },
  {
    footerLink: 'Terms',
    url: /\/terms$/,
    heading: 'Terms of Service',
    paragraph: /published formal terms of service yet/i,
  },
];

test.describe('legal pages', () => {
  for (const { footerLink, url, heading, paragraph } of LEGAL_PAGES) {
    test(`${footerLink} opens from the footer with its heading and text`, async ({ page }) => {
      await page.goto('/');
      await page
        .locator('footer')
        .getByRole('link', { name: footerLink, exact: true })
        .click();

      await expect(page).toHaveURL(url);
      await expect(page.getByRole('heading', { name: heading, level: 1 })).toBeVisible();
      await expect(page.getByText(paragraph)).toBeVisible();
    });
  }
});
