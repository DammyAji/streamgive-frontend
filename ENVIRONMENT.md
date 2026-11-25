# Environment variables

Copy `.env.example` to `.env.local` and fill in any blank values before
starting the dev server. All variables are prefixed `NEXT_PUBLIC_` because
Next.js inlines them at build time — they are embedded in the client bundle
and are **not secret**. Never put credentials or private keys here.

| Variable | Development default | Needed in production? | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000` (silent fallback) | **Yes.** A missing or blank value throws a configuration error in any non-development build (tests and GitHub Actions builds are exempt). | Base URL of the `streamgive-backend` API. |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3001` (silent fallback) | No, but set it so `robots.ts`, `sitemap.ts` and page metadata use your real origin instead of localhost. | The app's own origin, used to build absolute URLs for SEO metadata. |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` (silent fallback) | **Yes for mainnet.** It falls back to testnet without warning, so a production build that forgets it talks to testnet. | Stellar Soroban RPC endpoint used for all on-chain reads and contract calls. Must match the network of the deployed contracts. |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` (silent fallback) | **Yes for mainnet.** Same silent testnet fallback. | Stellar network passphrase. Use `Public Global Stellar Network ; September 2015` for mainnet. |
| `NEXT_PUBLIC_DONATION_VAULT_CONTRACT_ID` | None in code (empty string). `.env.example` pre-fills the testnet id. | **Yes.** Without it contract calls have no target. | Soroban contract ID of the deployed `DonationVault` contract. Find the current value in `streamgive-contracts/deployments.json`. |
| `NEXT_PUBLIC_NGO_REGISTRY_CONTRACT_ID` | None in code (empty string). `.env.example` pre-fills the testnet id. | **Yes.** Without it contract calls have no target. | Soroban contract ID of the deployed `NgoRegistry` contract. Find the current value in `streamgive-contracts/deployments.json`. |
| `NEXT_PUBLIC_USDC_ISSUER` | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5` (testnet, silent fallback) | **Yes for mainnet.** Switch to the mainnet issuer. | Stellar account address of Circle's USDC issuer. The USDC token contract address is derived from this value at runtime. |
| `NEXT_PUBLIC_ADMIN_ADDRESS` | Empty string | Only to show the "Platform Admin" nav link. The backend enforces admin access either way. | Wallet address allowed into `/platform-admin`. Must match the backend's `ADMIN_ADDRESS`. |

## Notes

- **Build-time inlining.** `NEXT_PUBLIC_*` vars are read once when `next
  build` (or `next dev`) runs and baked into the JS bundle. Changing them
  in `.env.local` requires a dev-server restart; in Docker, rebuild the
  image — passing `--env-file` at `docker run` alone has no effect on
  already-inlined values.
- **No secrets here.** Contract IDs and RPC URLs are all public
  identifiers. If you ever need a server-side secret (e.g. an admin API
  key), use a variable without the `NEXT_PUBLIC_` prefix so Next.js keeps
  it server-side only and out of the browser bundle.
- **Network consistency.** `NEXT_PUBLIC_SOROBAN_RPC_URL`,
  `NEXT_PUBLIC_NETWORK_PASSPHRASE`, `NEXT_PUBLIC_DONATION_VAULT_CONTRACT_ID`,
  `NEXT_PUBLIC_NGO_REGISTRY_CONTRACT_ID`, and `NEXT_PUBLIC_USDC_ISSUER`
  must all refer to the same Stellar network. A mismatch typically
  produces XDR decode errors or "contract not found" failures that can be
  hard to diagnose.
