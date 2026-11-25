# Wallet troubleshooting

Fixes for the most common wallet connection problems. Network settings come
from `NEXT_PUBLIC_NETWORK_PASSPHRASE` (testnet by default).

## Wallet troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| "No wallet detected" with a list of wallets | No supported wallet extension is installed in this browser | Install one of the listed wallets, reload the page and connect again. |
| The Connect Wallet button does nothing or the wallet window never opens | The browser blocked the popup | Allow popups for this site, then click Connect Wallet again. |
| Connecting hangs or the wallet shows nothing to approve | The wallet is locked | Open the wallet, enter your password to unlock it, then retry. |
| A "Wrong network" badge appears next to your address | The wallet is on a different network than the app expects | Switch the wallet to the network named in the badge tooltip, then reload. |
| The connection modal closes without an error | You dismissed the modal | Click Connect Wallet again and approve the request in the wallet. |
| Still connected to the old account after switching accounts | Stale session | Hard refresh the page. The app reads the wallet address again on load. |
| Transactions fail right after connecting | Wrong network, or the account has no funds for fees | Confirm the network, then fund the account (use the testnet faucet on testnet). |

## Still stuck

Open the browser console and look for errors from the wallet kit, since most
connection errors are logged there. Include them when you ask for help.
