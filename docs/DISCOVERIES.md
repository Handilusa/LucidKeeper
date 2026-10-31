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
