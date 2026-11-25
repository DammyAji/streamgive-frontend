# Content-Security-Policy

The policy is built per request in [`src/middleware.ts`](../src/middleware.ts)
(`contentSecurityPolicy`). This page explains each directive and how to allow
a new origin.

## Directives

| Directive | Value | Why |
|---|---|---|
| `default-src` | `'self'` | Anything not listed below is same-origin only. |
| `script-src` | `'self'`, a per-request `'nonce-...'`, the SHA-256 hash of the theme-init script (plus `'unsafe-eval'` in development) | Next.js bootstrap scripts carry the nonce and the inline theme-init script in `layout.tsx` is matched by its hash, so no `'unsafe-inline'`. React Refresh needs eval in development only. |
| `style-src` | `'self' 'unsafe-inline'` | Inline styles set by components. |
| `img-src` | `'self' data: blob:` | Local images, data URIs and the QR code. |
| `font-src` | `'self' data:` | Self-hosted fonts only. |
| `connect-src` | `'self'`, the API origin, the Soroban RPC origin, `https://*.stellar.org`, WalletConnect hosts | Every host the app or the wallet kit makes requests to. |
| `frame-src` | `'self'`, `https://verify.walletconnect.com`, `https://verify.walletconnect.org` | The WalletConnect verify iframe. |
| `object-src` | `'none'` | No plugins. |
| `base-uri` | `'self'` | Stops an injected `<base>` tag rewriting relative URLs. |
| `form-action` | `'self'` | Forms can only post to this origin. |
| `frame-ancestors` | `'none'` | Added on every route except `/embed/*`. |

## The embed exception

`/embed/*` is meant to be iframed on third-party NGO sites, so the middleware
leaves out `frame-ancestors 'none'` and the `X-Frame-Options: DENY` header for
paths that start with `/embed`. Every other route blocks framing. See
[EMBED.md](./EMBED.md).

## Adding an origin safely

1. Find the directive the request falls under: `connect-src` for fetch,
   XHR and WebSocket calls, `img-src` for images, `frame-src` for iframes,
   `script-src` for scripts.
2. Add the narrowest origin that works, for example
   `https://api.example.com` rather than `https:` or `*`.
3. If the origin is configurable, read it from an env var and pass it through
   `originOf()`, as is done for `NEXT_PUBLIC_API_URL` and
   `NEXT_PUBLIC_SOROBAN_RPC_URL`, so a non-default deployment is not blocked
   by its own policy.
4. Do not add `'unsafe-eval'` to production, and do not widen `script-src`
   to fit a third-party script without a review.
5. Load the page with the browser console open and confirm there are no
   `Content-Security-Policy` violations on the normal and the `/embed` routes.
