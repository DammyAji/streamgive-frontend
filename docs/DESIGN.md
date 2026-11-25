# Design system

A short reference for the colours, type, spacing and shared components the app
already uses, so new UI reuses them instead of picking a fresh value. There is
no `tailwind.config.*` and no custom colour tokens: everything is a Tailwind v4
utility, and the only theme tokens are the two fonts in
[`src/app/globals.css`](../src/app/globals.css). See [THEMING.md](./THEMING.md)
for how dark mode works and [ACCESSIBILITY.md](./ACCESSIBILITY.md) for focus and
contrast rules.

## Colour tokens

Always pair a light class with its `dark:` counterpart.

| Purpose | Light | Dark |
| --- | --- | --- |
| Page background / text | `bg-white` / `text-gray-900` | `dark:bg-gray-950` / `dark:text-gray-100` |
| Secondary text | `text-gray-600`, `text-gray-500` | `dark:text-gray-400` |
| Borders and dividers | `border-gray-200`, `border-gray-300` | `dark:border-gray-800`, `dark:border-gray-700` |
| Primary button | `bg-black text-white hover:bg-gray-800` | `dark:bg-white dark:text-black dark:hover:bg-gray-200` |
| Subtle surface / hover | `bg-gray-50`, `hover:bg-gray-100` | `dark:bg-gray-900`, `dark:hover:bg-gray-800` |
| Error text | `text-red-600` | `dark:text-red-400` |
| Warning text | `text-amber-700` | `dark:text-amber-400` |
| Verified / success badge | `bg-green-100 text-green-800` | `dark:bg-green-900 dark:text-green-300` |
| Focus ring | `focus-visible:ring-2 focus-visible:ring-teal-600` | `dark:focus-visible:ring-teal-400` |

Teal is only used for focus rings. High contrast mode (`data-contrast`) and
print styles are handled in `globals.css`, so do not hard-code colours that
fight them.

## Type scale

Fonts: Geist Sans (`font-sans`) for text and Geist Mono (`font-mono`) for
addresses, ids and amounts.

| Use | Classes |
| --- | --- |
| Body, labels, buttons, table cells | `text-sm` (the most used size) |
| Captions, hints, badges | `text-xs` |
| Lead text | `text-base` or `text-lg` |
| Section headings | `text-xl` or `text-2xl` with `font-semibold` or `font-bold` |
| Page titles and the landing hero | `text-3xl` and up with `font-bold` |

Weights: `font-medium` for buttons and labels, `font-semibold` and `font-bold`
for headings.

## Spacing and layout

Spacing uses Tailwind's default 4px scale. The values the app reaches for most:

- Padding: `px-4` or `px-6` for page and card gutters, `py-2` for buttons and
  inputs, `py-16` for page sections, `p-4` or `p-6` for cards.
- Gaps: `gap-2` between inline items, `gap-4` for form and card grids, `gap-6`
  or `gap-8` between sections. In stacked flows use `space-y-4`.
- Content width: `max-w-md` for forms and single-column cards, `max-w-2xl` for
  reading text, `max-w-4xl` and wider for page containers.
- Radius: `rounded-md` for buttons and inputs, `rounded-lg` for cards and
  panels, `rounded-full` for pills and avatars.
- Borders: `border border-gray-200 dark:border-gray-800` on cards.

## Shared components

Reuse these before building a new one. [COMPONENTS.md](./COMPONENTS.md) has the
full tree.

| Component | Use it for |
| --- | --- |
| `common/AppShell` | Wraps every route with the environment banner, progress bar, toast host and the wallet and toast providers (skipped on `/embed/*`) |
| `common/ConnectWalletPrompt` | The "connect your wallet" card on protected pages |
| `common/CopyAddressButton`, `common/CopyLinkButton` | Copy to clipboard with a confirmation label |
| `common/RouteLoading`, `common/RouteError` | Loading and error states for a route (see [STATE_CONVENTIONS.md](./STATE_CONVENTIONS.md)) |
| `common/EnvironmentBanner` | Banner shown when the app is not on mainnet |
| `common/RouteProgressBar` | Top-of-page bar during route transitions |
| `layout/Header`, `layout/Footer`, `layout/Logo`, `layout/ThemeToggle`, `layout/LocaleSwitcher` | Site chrome |
| `toast/ToastProvider` | Success, error and info toasts |
| `wallet/ConnectWalletButton` | Wallet connect and disconnect |
| `ngos/NgoCardSkeleton` | Loading placeholder shaped like an NGO card |
| `landing/StatsStripSkeleton` | Loading placeholder for the stats strip |
| `streams/StreamDetailsModal` | Modal with the full detail of one stream |
| `faq/FaqAccordion` | Expandable question and answer list |
