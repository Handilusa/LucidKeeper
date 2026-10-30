# Unsigned perp order construction still requires a signer

Severity: normal
Area: SDK

## Steps to reproduce

1. Install `@somnia-chain/markets-sdk@0.32.1` and viem.
2. Run this read/build-only example. The account is an arbitrary public address used to demonstrate the API boundary; no key or transaction is involved.

```js
import { SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES } from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
const exchange = new SomniaMarkets({
  chain: hidekiTestnet,
  indexerUrl: 'https://hideki-dev.smk.somnia.host/v1/graphql',
  addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  account: '0x1111111111111111111111111111111111111111',
});
try {
  await exchange.trader.buildPlacePerpOrder({
    pool: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    isBid: true, price: 80500n * 10n ** 18n, quantity: 13000n, orderType: 2,
  });
} finally { await exchange.close(); }
```

## Expected

A way to encode an `UnsignedOrder` without possessing signing authority. This would let a frontend prepare an explicit order before wallet connection, or pass the call to a smart account execution layer. This is a missing capability/DX report, not a claim that unauthenticated sending should be permitted.

## Actual

Accessing `exchange.trader` throws before the build method is reached:

```text
SignerRequiredError: @somnia-chain/markets-sdk: createTrader is authenticated — construct SomniaMarkets with a privateKey / account / walletClient
```

Passing a bare public address via `setSigner({ account })` or `client.createTrader({ account })` also fails. The public account type accepts `Address`, but `resolveSigner` requires a local signing account or wallet client. A public address is sufficient for reads only.

## Evidence

Reproduced locally on 2026-10-26. Stack: `txSend.resolveSigner` → `writer.createWriter` → `trade.createTraderWithDeps` → `SomniaMarkets.traderFor`.

Published sources: `src/txSend.ts`, `src/orders.ts` (`buildPlacePerpOrder` / `perpOrderCall`), `src/writer.ts` (`UnsignedOrder`). The build implementation only encodes a call, but its enclosing trader is authenticated.

Workaround in LucidKeeper: encode `placeOrder` with the SDK's exported `perpPoolWriteAbi` and viem, tested for price, quantity, order type and expiry. No fake signer or private key is needed. No transaction hash: reproduction does not submit a transaction.

## Environment

- Windows, Node 24.19.0, SDK 0.32.1, viem 2.57.11.
- Somnia Tokyo / Hideki v2, chain 50383.
- Wallet address: `0x1111111111111111111111111111111111111111`, a public fixture in the historical reproduction; no signer. Authorized bounty EOA: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- Report prepared locally; not submitted and not confirmed as accepted or non-duplicate.
