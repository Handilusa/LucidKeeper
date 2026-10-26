# Hideki chain definition and network reference omit the documented Tokyo explorer

Severity: normal
Area: docs

## Steps to reproduce

1. In SDK 0.32.1, import `hidekiTestnet` from `@somnia-chain/markets-sdk/chains` and inspect `hidekiTestnet.blockExplorers`.
2. Read [Networks and endpoints](https://prd.smk.somnia.host/docs/typescript/reference/networks-and-endpoints).
3. Compare [dreamDEX perps developer docs](https://app.dreamdex.io/docs/developers/perps-testnet), which link the explorer for chain 50383.

## Expected

The official chain definition and network reference expose the Tokyo explorer, or explain any limitation that prevents including it. Apps should be able to discover the documented explorer from the chain configuration.

## Actual

`hidekiTestnet.blockExplorers` is `undefined`. Its published source says no public explorer is known for Hideki, and the network reference says Hideki carries no explorer. The dreamDEX developer page lists `https://explorer.testnet.somnia.network/tokyo`.

## Evidence

On 2026-10-26:

```text
SDK chain id: 50383
hidekiTestnet.blockExplorers: undefined
GET https://explorer.testnet.somnia.network/tokyo
HTTP 200
HTML title: Somnia Explorer (Testnet)
```

This confirms a documentation/configuration inconsistency. It does not verify every explorer function or any particular transaction detail route.

## Environment

- SDK 0.32.1, Node 24.19.0, Windows.
- Somnia Tokyo / Hideki v2 testnet, chain ID 50383.
- Wallet: none used in this reproduction. Bounty EOA context: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- No tx hash: metadata/documentation reads only.
- Prepared locally; not submitted and not confirmed as accepted or non-duplicate.
