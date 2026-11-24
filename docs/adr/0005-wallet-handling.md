# ADR-0005: Handle wallets through StellarWalletsKit and one provider

- **Status:** Accepted
- **Date:** 2026-11-24 (recorded)
- **Decision owners:** StreamGive maintainers

## Context

Users connect different Stellar wallets, and several pages need the address and
signing. Connection failures (locked wallet, wrong network, closed popup) are
the most common support question.

## Decision

Use StellarWalletsKit for connection and signing, and expose it only through
`WalletProvider` and `useWallet`. The provider restores a previous session on
load, checks the wallet network against the configured passphrase, and shows an
error toast for failures other than the user closing the modal.

## Consequences

Components never talk to a wallet extension directly, so a new wallet needs no
page changes. Support steps for connection problems live in
[WALLET_TROUBLESHOOTING.md](../WALLET_TROUBLESHOOTING.md).
