# Release discoveries — 31 October 2026

## Verified code/source findings

- Public profiles are explicit read-only `/app/profile/:address` views. They never select the signer. No disconnected default account. Connected profile, public-watch aliases, query caches and exports use normalized Tokyo addresses. URL/alias ≠ ownership proof or privacy.
- SDK 0.32.1 uses **WebSocket for its chain reads**, not the wagmi HTTP transport. The test harness now intercepts HTTP **and** WebSocket; unknown sockets are closed. Initial profile test observed real zero equity because the socket was unmodeled; that failed run is not offline acceptance evidence. No transaction was sent. Corrected tests return controlled B=70 USDso and verify the requested address/pinned block.
- SDK history verifies indexer `chain_metadata`, stamps configured chain context and uses an endpoint governor with a 30-second circuit cooldown. Fixtures now model those real response shapes; nonempty owner/window and source-failure/recovery cases run rather than treating an empty response as coverage.
- Client filtering rechecks accounts, windows, verified pools, duplicate IDs and explicit chain IDs for fills/changes/funding/fees/transfers. Ended orders lack an owner field in the SDK output: ownership depends on the SDK's `owner._eq` query predicate, reviewed in installed `perp/portfolio.js`; this is not independent row ownership proof.

## Unavailable financial inputs — do not infer them

| Input/result | Why unavailable | Required before enabling |
| --- | --- | --- |
| Equity at both historical window boundaries | Current `getMarginAccount` is not historical equity; no verified boundary-block/archive/mark/funding reconstruction integrated | Canonical equity at exact start/end blocks with unit and freshness evidence |
| Complete ordered external cash flows | Newest 1,000 `MarginEvent` rows have no completeness guarantee; output lacks block/log ordering | Complete Deposit/Credited/Withdraw evidence with block/log order; exclude locks; reconcile credits and protocol movements |
| Full window PnL / ROI | Cannot replace equity delta with realized price PnL or omit unrealized/funding/fees | Verified boundary equity and complete ordered flows |
| Historical equity curve | No canonical time series | Verified mark/funding/equity samples, no fabricated interpolation |
| Closed-cycle win rate | Several updates/fills can belong to one trade; flips require decomposition | Complete trade-cycle reconciliation |
| Global profit leaderboard | No verified comparable population/full-return dataset | Comparable, complete real cohort and return inputs |

The tested ROI helper implements `PnL = ending equity − starting equity − net inflow`, then `ROI = PnL / max(100 USDso, starting equity + maximum cumulative net inflow)`. Cash flows are start-inclusive/end-exclusive and chain-ordered (block, log index); negative results and the denominator floor are tested. The production view intentionally provides unavailable boundary/coverage inputs. This is the user's formula, not verified Hyperliquid attribution.

## Bounded leaderboard, not a profit claim

Only up to five addresses actually connected on Tokyo in **this browser** enter a local, clearable registry. A public address lookup does not enroll it. Seven-day returned fill quote notional ranks the list. It is not a global leaderboard, ownership verification or profit ranking; up to 1,000 fills, indexer lag and missing rows limit comparison. Empty/error data stays labeled. No seeded traders or hardcoded performance.

## Still requires human QA

Independent wallet funding/claim eligibility and actual receiving address; wallet-extension signing; real fills/settlement and liquidity-driven partial fills; concurrency after close preflight; deployed version parity. See [MANUAL_QA](MANUAL_QA.md). No agent execution or claims authorized by these discoveries.

---

# Historical protocol reference (retained)

The pre-existing reference below is retained intact. Its numeric position example is historical, not a current equity, position or safety claim; these original assertions were not independently reverified during the release-blocker work.

# LucidKeeper — Protocol Discoveries & SDK Specifications (DISCOVERIES.md)

This document serves as the canonical technical reference for dreamDEX on Somnia Tokyo testnet. All values and formulas are verified from `@somnia-chain/markets-sdk` v0.32.1, official indexers, and on-chain contract bytecode.

---

## 1. Network & Infrastructure

| Resource | Value | Notes |
| :--- | :--- | :--- |
| **Chain Name** | Somnia Tokyo (Hideki v2 testnet) | Verified via `hidekiTestnet` definition |
| **Chain ID** | `50383` | Strictly enforced |
| **RPC Endpoint** | `https://api.hideki2.infra.testnet.somnia.network` | HTTP JSON-RPC |
| **WebSocket RPC** | `wss://api.hideki2.infra.testnet.somnia.network/ws` | For live block headers & event logs |
| **GraphQL Indexer** | `https://hideki-dev.smk.somnia.host/v1/graphql` | Historical candles, trades, accounts |
| **Block Explorer** | `https://explorer.testnet.somnia.network/tokyo` | Transaction and address verification |

---

## 2. Protocol Contracts (Somnia Tokyo)

| Contract | Address | Source / Function |
| :--- | :--- | :--- |
| **MarginBank** | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` | Cross-margin collateral custodian & risk engine |
| **Collateral Token (USDso)** | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` | ERC-20, 18 decimals |
| **PerpPool Factory** | Verified via `marginBank.getSystemConfig().perpPoolFactory` | Deploys and authorizes official PerpPools |
| **BTC-PERP Pool** | `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` | Primary trading market (8 base / 18 quote decimals) |

---

## 3. Market Grid & Decimal Standards

Perp markets have distinct decimal scales and execution grids:

- **Base Decimals:** Synthetic asset precision (e.g., BTC = 8 decimals, ETH = 18 decimals, SOL = 9 decimals).
- **Quote Decimals:** Collateral precision (USDso = 18 decimals).
- **One Base:** $10^{\text{baseDecimals}}$, read on-chain via `pool.getOneBase()`.
- **Order Grid Parameters:** Read via `pool.getOrderBookParameters()`:
  - `tickSize`: Minimum price increment (raw quote units).
  - `lotSize`: Minimum quantity step (raw base units).
  - `minQuantity`: Minimum executable order size (raw base units, e.g. 13,000 for BTC = 0.00013 BTC).

---

## 4. On-Chain Financial Math & Formulas

All mathematical definitions match the smart contract implementation in `MarginBank.sol` and `PerpMath.sol`:

### 4.1 Notional Calculation
$$\text{Notional} = \frac{|\text{size}| \times \text{markPrice}}{\text{oneBase}}$$
*(in raw quote/collateral units, 18 decimals)*

### 4.2 Unrealized PnL (Price only)
- **Long position:**
  $$\text{uPnL} = \frac{(\text{markPrice} - \text{avgEntryPrice}) \times \text{size}}{\text{oneBase}}$$
- **Short position:**
  $$\text{uPnL} = \frac{(\text{avgEntryPrice} - \text{markPrice}) \times |\text{size}|}{\text{oneBase}}$$
*(Truncates toward zero using signed integer arithmetic)*

### 4.3 Accrued Funding Owed
$$\text{accruedFunding} = \lceil \frac{\text{size} \times (\text{projectedCumulativeFunding} - \text{entryFundingIndex})}{10^{18} \times \text{oneBase}} \rceil$$
*(Positive means account pays; negative means account receives)*

### 4.4 Position Equity Contribution
$$\text{equityContribution} = \text{uPnL} - \text{accruedFunding}$$

### 4.5 Position Margin Requirements
- **Initial Margin Requirement (IM):**
  $$\text{imReq} = \lceil \frac{\text{Notional} \times \text{effectiveImfBps}}{10000} \rceil$$
- **Maintenance Margin Requirement (MM):**
  $$\text{mmReq} = \lceil \frac{\text{Notional} \times \text{maintenanceMarginBps}}{10000} \rceil$$
- **Close-out Margin Requirement (CM):**
  $$\text{cmReq} = \lceil \frac{\text{Notional} \times \text{closeOutMarginBps}}{10000} \rceil$$

### 4.6 Exact Liquidation Price Formula & Canonical Protocol Source

**Canonical Protocol Source:**
- **Smart Contract:** `MarginBank.sol` (`_classify`, `_marketHealthFromSnapshot`) and `PerpPool.sol` (`getPerpPoolParameters`).
- **SDK Reference:** `@somnia-chain/markets-sdk` v0.32.1, file `dist/perp/margin.d.ts` (lines 250-293) and `dist/perp/margin.js` function `perpLiquidationPrice(inputs)`.
- **Underlying Principle:** Both sides of the inequality move concurrently with the mark price. Liquidation begins where $\text{equity} = \text{mmReq}$.
  - Unrealized PnL moves equity at $\frac{\text{size}}{\text{oneBase}}$ per unit of price.
  - Concurrently, maintenance requirement $\text{mmReq}$ is recomputed as $\lceil \frac{|\text{size}| \times \text{mark} \times \text{mmBps}}{\text{oneBase} \times 10000} \rceil$.
  - Solving $\text{equity}(p) = \text{mmReq}(p)$ yields the canonical equation:
    - **Long position:**
      $$P_{\text{liq}} = \text{markPrice} - \frac{(\text{Equity} - \text{mmReq}) \times \text{oneBase} \times 10000}{|\text{size}| \times (10000 - \text{maintenanceMarginBps})}$$
    - **Short position:**
      $$P_{\text{liq}} = \text{markPrice} + \frac{(\text{Equity} - \text{mmReq}) \times \text{oneBase} \times 10000}{|\text{size}| \times (10000 + \text{maintenanceMarginBps})}$$

**Live Verification against Open Position (0.00013 BTC Long):**
- $\text{size} = 13,000$ atoms ($0.00013 \text{ BTC}$)
- $\text{oneBase} = 10^8$
- $\text{entryPrice} = 79,946.0 \text{ USDso}$
- $\text{currentMark} = 80,456.8 \text{ USDso}$
- $\text{Equity} = 2.0 \text{ USDso} + (80,456.8 - 79,946.0) \times 0.00013 = 2.0664 \text{ USDso}$
- $\text{maintenanceMarginBps} = 250 \text{ bps}$ ($2.5\%$, read on-chain from `getPerpPoolParameters`)
- $\text{mmReq} = 10.459 \times 0.025 = 0.2615 \text{ USDso}$
- Calculated Liquidation Price: $\sim 65,400 \text{ USDso}$.
- Distance to liquidation: $\approx +18.7\%$, confirming the position is solidly in the **SAFE** zone (Health factor $> 3.8\times$).

---

## 5. Indexer OHLCV & Candle Specs

- **Function:** `getCandles(poolAddress, intervalSeconds, options, indexerUrl)`
- **Materialized Intervals (`CANDLE_INTERVALS`):**
  - `60` (1 minute)
  - `300` (5 minutes)
  - `900` (15 minutes)
  - `3600` (1 hour)
  - `14400` (4 hours)
  - `86400` (1 day)
- **Candle Fields:** `bucketStart` (timestamp), `openPrice`, `high`, `low`, `closePrice`, `baseVolume`, `quoteVolume`, `tradeCount`, `lastFillId`.
- **Handling Sparse Data:** Gaps represent periods of zero fills on testnet. The SDK's `densifyFundingBuckets` / chart adapter ensures gaps are represented with zero coverage without fabricating synthetic fills.
