# Lucidkeeper

**Verified perps execution tooling for the dreamDEX Perps Builder Bounty on Somnia Tokyo testnet.**

Lucidkeeper helps builders and traders inspect real market/account data, review proposed actions, and preserve verifiable execution evidence. The intended MVP is a trader tool with risk monitoring and user-reviewed test orders. An on-chain reactive risk guardian is planned, not implemented.

## Current status — 26 October 2026

**HOLD: approval, margin deposit and owner-order preparation are disabled.** The user must confirm in writing that the dreamDEX team permits these funds to be used as margin. An owner order can auto-pull approved collateral, so it cannot bypass the hold.

- Official SDK **0.32.1** installed; **21 perp markets** discovered.
- Market units, BTC pool, MarginBank and collateral checked against the chain.
- Read-only account checks and canonical-receipt/event verification implemented.
- Historical unsigned calldata builders exist, but are held and are **not yet full offline-signing transaction builders**.
- **14 offline tests pass**, including exact amounts, account restrictions, receipt semantics and the hold. CI is configured for Node 22 and 24; remote CI results are pending publication.
- **No Lucidkeeper order has been submitted. No project trade hash exists.** There is no signing page, connected signer, live broadcaster, frontend, implemented reactive contract or PnL calculation.

## Account and signing model

This is **Builder Bounty development, not Perps Arena participation**.

- Sole account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- Sole chain: **Somnia Tokyo / Hideki v2, 50383**.
- No Arena accounts or smart-wallet operations; no wallet-to-wallet transfers.
- **OpenCode is the principal and never handles signing secrets.** Only the user's separate offline local AI may sign. No private keys, seed phrases or keystores are read, requested, stored, logged or generated here, including in tests.
- The official dapp origin remains **`https://app.testnet.dreamdex.io`**. No local signing page or substitute claim flow.

After the hold is explicitly released, the agreed flow is:

1. Prepare one **complete unsigned JSON** under `evidence/unsigned/`: `chainId`, `from`, `to`, `value`, `data`, `nonce`, `gas`, `fees`, and a plain-English description.
2. Show it to the user. The user reviews and personally gives it to the offline signer.
3. The user returns the signed raw transaction. The principal verifies the recovered sender and exact payload against the reviewed JSON before broadcasting to the official RPC.
4. Save the hash, receipt and account events. Distinguish confirmation, order acceptance, fills and resulting position.

The [offline-signing contract](docs/OFFLINE_SIGNING.md) describes the allowlist and validation requirements. The [unsigned JSON schema](docs/unsigned-transaction.schema.json) specifies the format; it is not a signing implementation or policy approval. Full-envelope preparation and raw-transaction broadcasting remain implementation work after the hold.

## Run locally

Requires **Node.js 22+** and npm. From the project directory:

```powershell
npm ci
npm test
npm run check -- --address 0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA
```

The tests are offline, use isolated public fixtures and never submit transactions. The last command makes public read-only requests and saves dated evidence locally; generated records are ignored by Git until separately reviewed for publication. No credentials or signing secrets are needed.

`check` without `--address` reads markets and reports `No Data` for the account. `--market SOL` selects another market for deeper contract/unit verification. Only the selected market is fully cross-checked; the general list comes from the official indexer.

### Commands and boundaries

| Command | Behavior |
| --- | --- |
| `npm test` | Offline tests; no live network or signatures |
| `npm run check -- --address EOA` | Read markets, book, balances, margin and voucher eligibility; never claims |
| `npm run margin:prepare -- ...` | **HOLD:** exits before argument parsing, RPC reads or generating evidence |
| `npm run order:prepare -- ...` | **HOLD:** exits before argument parsing, RPC reads or generating evidence |
| `npm run order:verify -- --address EOA --market BTC --hash HASH` | Read and validate an existing canonical receipt and account events |

Use only the authorized EOA for bounty work. An existing receipt may show no fill, and a transaction from another tool does not prove Lucidkeeper submitted it. Position reads after a receipt are labeled separately. No PnL is inferred from pool-wide fills.

## Network and contracts

| Setting | Verified value |
| --- | --- |
| Chain | Tokyo / Hideki v2, **50383** |
| RPC | `https://api.hideki2.infra.testnet.somnia.network` |
| WebSocket | `wss://api.hideki2.infra.testnet.somnia.network/ws` |
| Indexer | `https://hideki-dev.smk.somnia.host/v1/graphql` |
| Explorer | `https://explorer.testnet.somnia.network/tokyo` |
| Gas coin | STT |
| Collateral | USDso, 18 decimals, `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` |
| MarginBank | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` |

PerpPool addresses and price/quantity grids are discovered from live markets and verified on chain. The SDK's generic collateral address is not the perps collateral. Do not use the bot kit's general spot/Shannon quickstart for Tokyo perps.

BTC's observed base precision is 8 decimals, minimum quantity 0.00013 BTC, lot 0.00001 BTC and price tick 0.1 USDso. These are dated observations, not permanent configuration; re-read before preparing an order. Other markets have different base precision.

## Evidence

| Observation | Evidence |
| --- | --- |
| EOA: **90 STT, 200 USDso in wallet, 0 margin, 0 active perp pools** | [Reviewed public read record: 26 Oct 17:05 UTC, block 33821736](evidence/public/connectivity-2026-10-26.json) |
| Submitted Lucidkeeper orders, fills and positions | **Pending; no hashes** |

The public record is a small extract of the original read-only observation: network, SDK version, market count, public account, block and balances. Raw SDK responses and voucher eligibility remain local. It is dated evidence, not a live feed or an atomic snapshot across services. Missing data and service errors remain explicit.

Earlier `evidence/prepared-*.json` drafts are retained **locally only** as historical artifacts. They were never approved or sent, lack the required nonce/gas/fee envelope, and must not be handed to the offline signer. All evidence is ignored by default; only explicitly reviewed files under `evidence/public/` are allowed. Unsigned handoffs and signed raw payloads stay local. Funding balances do not establish permission to use funds as margin.

## Project layout

```text
src/lib/
  dreamdex.mjs         Network, account reads, market units and event validation
  funding.mjs          Historical exact-amount calldata encoder; no signer
  operating-policy.mjs Active hold; no CLI/environment bypass
scripts/
  connectivity.mjs    Public reads and dated evidence
  prepare-margin.mjs  Held legacy funding preview
  prepare-order.mjs   Held legacy IOC preview
  verify-order.mjs    Receipt and account-event verification
test/                 Offline validation and hold tests
docs/                 Offline handoff contract and JSON schema
evidence/public/      Individually reviewed publication records
feedback/             One report per issue, plus reporting format
.github/workflows/    Offline CI on Node 22 and 24
```

## Feedback

See [the feedback index and format](feedback/README.md). Each report includes title, severity, area, steps, expected/actual behavior, evidence and environment. Reproduced SDK/docs issues are separated from unconfirmed connectivity diagnostics. Reports have not been submitted or accepted by the bounty program.

## Remaining delivery work

- Obtain the user's written confirmation of dreamDEX permission before releasing the margin hold.
- Implement and test the complete offline handoff/broadcast path without handling keys.
- Execute one user-reviewed small test order, then record its actual receipt, fills and position.
- Build the trader-tool MVP and demonstrate risk monitoring. Reactive contracts and PnL cards require separate implementation and on-chain evidence.
- Publish the demo and real X post links below. No simulated fills, balances or profits substitute for these deliverables.

Submission deadline supplied by the user: **1 November 2026, 23:59 UTC**. The complete event terms have not been independently verified in this session.

## X posts

Posts must mention **`@DreamDEXSomnia`**. No posts have been published; these are delivery placeholders, not links to existing posts.

| Post | Intended evidence | URL |
| --- | --- | --- |
| Build introduction | What Lucidkeeper does, current verified scope and repository | Pending |
| First real execution | Tokyo transaction hash, receipt and actual outcome | Pending first order |
| MVP demo | Working trader-tool walkthrough and verified limitations | Pending MVP |

## Official references

- [dreamDEX testnet developer documentation](https://app.testnet.dreamdex.io/docs/developers/perps-testnet)
- [dreamdex-bot-kit](https://github.com/somnia-chain/dreamdex-bot-kit) and its [perps-specific setup](https://github.com/somnia-chain/dreamdex-bot-kit/blob/main/docs/perps.md)
- [SDK perps documentation](https://prd.smk.somnia.host/docs/typescript/perps)
- [Somnia Tokyo explorer](https://explorer.testnet.somnia.network/tokyo)
