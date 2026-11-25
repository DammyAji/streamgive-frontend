import { expect, test } from '@playwright/test';

/**
 * Full-page screenshots of the main pages in light and dark mode at a
 * desktop and a mobile width. Run with `npm run test:visual`; regenerate the
 * baselines with `npm run test:visual:update` after an intended UI change.
 *
 * The dashboard is captured disconnected (no wallet), which is the state
 * every visitor starts in.
 */
const PAGES = [
  { name: 'landing', path: '/' },
  { name: 'explorer', path: '/ngos' },
  { name: 'dashboard', path: '/dashboard' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'mobile', width: 375, height: 667 },
];

const THEMES = ['light', 'dark'] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`visual regression at ${viewport.name} width`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const theme of THEMES) {
      for (const { name, path } of PAGES) {
        test(`${name} page in ${theme} mode`, async ({ page }) => {
          // THEME_INIT_SCRIPT reads this key before hydration.
          await page.addInitScript((value) => {
            localStorage.setItem('theme', value);
          }, theme);

          await page.goto(path);

          await expect(page).toHaveScreenshot(`${name}-${theme}-${viewport.name}.png`, {
            fullPage: true,
            animations: 'disabled',
          });
        });
      }
    }
  });
}
