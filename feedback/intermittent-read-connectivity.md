# Intermittent indexer and WebSocket failures during read-only preparation

Severity: low — reads occasionally fail and block preparation; retries succeeded. Root cause is unconfirmed and may be local networking rather than the SDK or service.
Area: SDK / API connectivity

## Steps to reproduce

Observed intermittently on 2026-10-26 around 17:08–17:10 UTC from Windows, using SDK 0.32.1 without a signer. Not a deterministic reproduction.

1. The original failure was observed with the following command **before the margin HOLD**:

   ```powershell
   npm run margin:prepare -- --address 0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA --amount 2
   ```

2. Do **not** rerun that preparation during the current HOLD. To investigate reads only, construct the read-only SDK client on Hideki, call `listPerpMarkets()`, verify the BTC market, and call `exchange.client.getBookTopsOnchain([btc])`.
3. If a read fails, capture the cause and retry that read once. Do not prepare or send transactions to investigate this diagnostic.

## Expected

The official indexer returns markets and the official WebSocket RPC returns the current block/book, or reports a diagnostic error. A failed read must prevent transaction preparation rather than substitute synthetic values.

## Actual

The first margin preview failed while fetching markets. One immediate rerun succeeded. A separate book query then timed out on `eth_blockNumber` over WebSocket; one rerun succeeded. The failures were surfaced and no order was sent. There is no evidence yet that either failure is an SDK defect or that they have the same cause.

## Evidence

First margin command output:

```text
Margin preparation failed: @somnia-chain/markets-sdk: indexer PerpMarkets failed: fetch failed
```

Configured indexer: `https://hideki-dev.smk.somnia.host/v1/graphql`. No HTTP response/status was captured for that failure.

Separate book-query error:

```text
RpcError: @somnia-chain/markets-sdk: rpc getBlockNumber failed: The request took too long to respond.
Cause: TimeoutError
URL: wss://api.hideki2.infra.testnet.somnia.network/ws
Request body: {"method":"eth_blockNumber"}
Details: The request timed out.
Version: viem@2.57.11
```

Successful retry evidence:
- Historical local margin preview at 17:09:12 UTC, account block 33823739. The unsigned draft is not published or approved for signing.
- Retried book query returned block 33824607 and BTC best ask 80475.3 USDso.
- Historical local order preview at 17:10:40 UTC read block 33824741 successfully; its collateral blocker was expected because deposited margin was zero, not this connectivity issue. That unsigned draft is not published or approved for signing.

No tx hash: all operations were reads or unsigned encodings.

## Environment

- SDK: `@somnia-chain/markets-sdk` 0.32.1; viem 2.57.11.
- Network: Somnia Tokyo / Hideki v2 testnet, chain ID 50383.
- Wallet: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` (public address only).
- Runtime / OS: Node 24.19.0, Windows PowerShell.
- Status: local diagnostic report; not submitted. Investigate networking and collect repeated request timings before attributing this to a service or SDK bug.
