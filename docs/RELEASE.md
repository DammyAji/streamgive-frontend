# Release checklist

Work through this list before every deploy. See
[DEPLOYMENT.md](./DEPLOYMENT.md) for the platform steps and
[ENVIRONMENT.md](../ENVIRONMENT.md) for the variable reference.

## Before deploying

- [ ] `main` is green in CI (lint, typecheck, test, build, e2e).
- [ ] Every `NEXT_PUBLIC_*` variable is set for the target. They are inlined at
      build time, so a change needs a rebuild.
- [ ] `NEXT_PUBLIC_API_URL` points at the matching `streamgive-backend`
      deployment.
- [ ] `NEXT_PUBLIC_DONATION_VAULT_CONTRACT_ID` and
      `NEXT_PUBLIC_NGO_REGISTRY_CONTRACT_ID` match the target network's
      entries in `streamgive-contracts/deployments.json`.
- [ ] Network values agree: `NEXT_PUBLIC_NETWORK_PASSPHRASE`,
      `NEXT_PUBLIC_SOROBAN_RPC_URL` and `NEXT_PUBLIC_USDC_ISSUER` are all
      testnet or all mainnet.
- [ ] `NEXT_PUBLIC_ADMIN_ADDRESS` matches the backend's `ADMIN_ADDRESS`.
- [ ] `CHANGELOG.md` has an entry for the release.

## After deploying

- [ ] The home page loads and the wallet connects on the expected network.
- [ ] The NGO list loads from the API.
- [ ] No Content-Security-Policy errors in the browser console (see
      [CSP.md](./CSP.md)).

## Rollback

Redeploy the last known good build. On Vercel, promote the previous
deployment from the dashboard. With Docker, run the previous image tag. If the
cause is a wrong variable, fix it and rebuild, because changing it on a running
build has no effect.
