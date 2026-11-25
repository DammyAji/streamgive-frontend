import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement',
};

export default function AccessibilityPage() {
  return (
    <main id="main" className="px-6 py-16 sm:px-12">
      <h1 className="text-2xl font-bold">Accessibility Statement</h1>
      <div className="mt-4 max-w-2xl space-y-4 text-gray-600 dark:text-gray-400">
        <p>
          StreamGive aims to meet the Web Content Accessibility Guidelines (WCAG) 2.1 level AA.
          The site supports keyboard navigation, screen readers, reduced motion, and light, dark
          and high contrast themes.
        </p>

        <h2 className="pt-2 text-lg font-semibold text-black dark:text-white">Known limitations</h2>
        <ul className="list-disc space-y-1 pl-6">
          <li>Wallet extensions and their signing prompts are outside our control and may not be fully accessible.</li>
          <li>Some translated pages may lag behind the English version.</li>
          <li>Live-updating figures, such as the impact page, refresh automatically.</li>
        </ul>

        <h2 className="pt-2 text-lg font-semibold text-black dark:text-white">Report a barrier</h2>
        <p>
          If you run into an accessibility barrier, please tell us what page you were on and what
          assistive technology you use.{' '}
          <a
            href="https://github.com/streamgive/streamgive-frontend/issues/new"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-black dark:hover:text-white"
          >
            Open an issue on GitHub
            {' '}<span className="sr-only">(opens in a new tab)</span>
          </a>
          .
        </p>
      </div>
    </main>
  );
}
