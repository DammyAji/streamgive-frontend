# Error reporting

Both error boundaries (`RouteError` for route-level `error.tsx` files and the
root `global-error.tsx`) report caught errors through a single, small module:
`src/lib/errorReporter.ts`.

## Default behaviour

Out of the box nothing leaves the browser. `reportError()`:

1. logs the full `Error` (message and stack) with `console.error` for local
   debugging; and
2. passes a **whitelisted** summary to the active reporter, which by default
   writes that summary to the console too.

No network request is made by the default implementation.

## Plugging in a service

Next.js 16 loads `instrumentation-client.ts` (in the project root, or in `src/`
when using a `src` directory) before the app becomes interactive. It needs no
exports; call `setErrorReporter()` there:

```ts
// src/instrumentation-client.ts
import { setErrorReporter } from '@/lib/errorReporter';

setErrorReporter({
  report(report) {
    void fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(report),
    }).catch(() => {
      // Reporting must never break the app.
    });
  },
});
```

`reportError()` and `setErrorReporter()` are client-side only. The reporter is
process-wide, so set it once during startup; calling `setErrorReporter()` again
replaces it. Pass `consoleErrorReporter` (exported from the module) to restore
the default, which is useful in tests.

## What a reporter receives

`ErrorReport` contains exactly three fields:

| Field      | Type                | Meaning                                      |
| ---------- | ------------------- | -------------------------------------------- |
| `name`     | `string`            | `error.name`, e.g. `TypeError`               |
| `digest?`  | `string`            | Next.js digest, for correlating with server logs |
| `boundary` | `'route' \| 'global'` | Which boundary caught the error             |

**Never** add `error.message`, `error.stack`, the `Error` object, `window.location`,
or arbitrary context to a reporter. Error messages in this app can contain
wallet addresses (for example a failed address lookup) or form values, and
those must never be sent to a third party. Use `digest` to find the full error
in the server logs instead.

The full `Error` is only ever logged locally in the browser via
`console.error(error)`.
