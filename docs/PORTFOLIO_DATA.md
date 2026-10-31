# Read-only portfolio data contract

30 October 2026 · `/app/profile` · Somnia Tokyo **50383** · SDK **0.32.1**.

## Identity and freshness

Updated 31 October 2026: disconnected visits show a connect-wallet state and make no account/history queries. There is no fallback to the bounty EOA. Connected reads and caches are keyed by Tokyo 50383 and normalized address; switching/disconnecting remounts account UI, clearing dialogs, drafts and receipt presentation. Aliases are validated (2–24 ASCII letters/numbers/spaces/underscore/hyphen), wallet/network-scoped in this browser, and removable by saving an empty value. Legacy unscoped storage is not imported or deleted. No URL, alias, badge or share image verifies ownership or on-chain privacy.

Account snapshots poll every 15 seconds. The SDK's `getMarginAccount` pins its fields to `asOfBlock`; position and mark reads use that same block. Failed snapshots or snapshots older than 45 seconds are hidden. Each view links the read block and shows the observation time. Wallet funds are excluded from MarginBank equity.

## Sources and units

| Display | Source | Calculation / boundary |
| --- | --- | --- |
| Equity / health / unlocked collateral / maintenance | `getMarginAccount` | Raw USDso, 18 decimals |
| Free collateral | Same pinned margin snapshot | `max(0, equity - imReq)`; not unlocked collateral |
| Positions | MarginBank `getPosition` + pool `tryGetMarkPrice` at `asOfBlock` | Signed base size; per-market verified decimals; no leverage inferred from a local setting |
| Position price uPnL | Position + valid mark | signed size × (mark − entry); excludes pending funding; unavailable mark yields no PnL |
| Realized price PnL | `listPerpPositionChanges` | Exact bigint sum of `realizedPnl`, then display conversion; not net returns |
| Fill volume | `getUserFills`, restricted to verified perp markets | Exact sum of `quoteQuantity`; avoids rounded size × price |
| Ended orders | `listPerpOrderHistory` | Window uses ended timestamp; links placement receipt. `Closed` is terminal, not still working |
| Settled funding | `getFundingPayments` | Positive raw payment = paid; negative = received |
| Net fees | `listPerpFees` | Charges minus rebates; no insurance double count, no STT gas |
| Transfers | `getMarginEvents` | Deposit/Withdraw/Credited only; locks are not external flows |

Existing terminal reads, ABI definitions, transaction construction, review, wallet behavior and signing paths are unchanged. A separate profile-only SDK instance has no wallet client. The profile never calls a writer or transaction preparation helper.

## Historical coverage

- Windows: 24 hours, 7 days, 30 days, all indexed; UTC start-inclusive/end-exclusive. The end is frozen when choosing a window or refreshing. Current positions remain current, independent of the historical filter.
- Up to **1,000 newest rows per source**. Fills and position changes are server-windowed. Other lists are filtered locally after that bounded read. At the cap the UI explicitly marks partial coverage. A shorter response does not prove complete on-chain history or indexer freshness.
- Tables sort by unformatted values, paginate ten rows, and export all loaded rows for the selected table/window with account, chain and transaction hashes. CSV guards formula-like text. The new portfolio does not use the terminal's local receipt cache as financial history.
- PnL chart steps sum observed realizing updates. It starts at the first returned update, with no fabricated baseline or prehistory. Volume bars show only days with observed fills. Values have an accessible text alternative.
- A read failure hides its metrics and table, with a retry action; independent sources can remain usable.

## Unavailable metrics

Requested ROI formula: `PnL / max(100, starting account value + max net deposits)` for the selected window, multiplied by 100 for a percentage. Max net deposits is the maximum cumulative net inflow during the window. No verified starting-equity/time-series feed or complete window-return reconstruction exists here; ROI and historical equity are unavailable. The formula is user-requested, **not verified as a Hyperliquid formula**.

Win rate is unavailable because complete closed trade cycles have not been reconstructed. One order can have several fills/position changes; counting green updates as winning trades is incorrect. No leaderboard is displayed without a verified cohort and comparable performance coverage.

Share PNGs contain the displayed address, local alias, current equity, selected-window indexed price PnL/volume, read block, observation/end times and testnet/watch/coverage labels. They are snapshots, not execution or profit attestations.

## Observed integration

30 October read-only SDK probe: 15 fills, 15 position updates, 14 ended orders, 3 transfers, 4 funding payments and 0 fee rows for the bounty EOA; margin block **37466801**. Dated observations, not hardcoded UI values or a current-position claim. Reproduce with `node scripts/inspect-profile-data.mjs`; its public read report is local under `.git/lucidkeeper-audit/landing-profile/sdk-reads.json`.

Official references: [dreamDEX developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet), [SDK perps reference](https://prd.smk.somnia.host/docs/typescript/perps), installed SDK declarations `perp/margin`, `perp/history`, `perp/portfolio`, `fills`.
