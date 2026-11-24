# ADR-0004: Offer the donate widget as an iframe route

- **Status:** Accepted
- **Date:** 2026-11-24 (recorded)
- **Decision owners:** StreamGive maintainers

## Context

NGOs want visitors to start a donation from their own website. The donate flow
needs a wallet, so it cannot be reduced to a static snippet.

## Decision

Serve a self-contained form at `/embed/[ngoId]` and let NGOs frame it with an
`<iframe>`. The route omits `X-Frame-Options: DENY`, which every other route
sends. The widget reports its content height to the parent with `postMessage`
so the host page can resize the frame.

## Consequences

NGOs need no build step and the widget updates with the app. Any site can frame
the route until a `frame-ancestors` allowlist exists. See
[EMBED.md](../EMBED.md) for the integration contract.
