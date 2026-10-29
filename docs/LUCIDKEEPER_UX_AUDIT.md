# LucidKeeper UX audit

Observed 28 October 2026. Scope: active React SPA in `src/`, its Vite entry, wallet providers, data adapters, transaction handlers and existing tests. The older `public/index.html` and parent reference project are not the active frontend. Baseline worktree was clean; 53/53 existing tests passed.

## Journeys and prioritized findings

| Priority / cost | Evidence in baseline | Trading impact | First-version action |
| --- | --- | --- | --- |
| P0 / small | `src/app/App.tsx:57` polls BTC-only `/api/status` independently of selected pool; mark retained across switches | Another asset can inherit BTC pricing | Derive mark from the selected pool query; surface unavailable/stale state |
| P0 / medium | `src/lib/data/indexer.ts:89` queries all Candle intervals and assumes 8 base decimals | Overlapping OHLC periods, duplicated volume and wrong token volume | Filter exact interval; use market decimals; validate OHLC and unique ascending seconds |
| P0 / small | `src/features/trade/TradingBox.tsx:259` uses free margin as account equity for liquidation; `PositionsTable.tsx:364` uses fixed ±18% | Unreliable liquidation estimates look authoritative | Display unavailable liquidation rather than an unsupported estimate; preserve financial math library |
| P0 / small | `TradingBox.tsx:153` labels every successful receipt “Placed & Filled” | A resting order or partial execution looks completely filled | Distinguish submitted, confirmed and fill verification in feedback |
| P1 / medium | `App.tsx:375` gives gas, wallet and mark four equal hero cards; account activity follows a large risk panel | Chart, execution and open positions compete with secondary data | Continuous chart/order workspace, grouped funds and immediate activity |
| P1 / small | Disconnected account silently falls back to bounty EOA; gas “Ready” and “Live Feed” are unconditional | Public account data appears to belong to the visitor; false feed confidence | Explicit read-only bounty account context and query-derived states |
| P1 / medium | Trade inputs accept blank/negative values; limit falls back to mark; `parseUnits` in render can throw | Invalid input can create an ambiguous preview or crash | Inline validation, safe parsing, explicit units and disabled submission |
| P1 / medium | Market menu lacks managed keyboard focus; custom modals lack focus trap/Escape; mobile header is crowded | Keyboard/mobile trading obstructed | Reuse installed Radix Select/Dialog/Tabs, visible focus and responsive navigation |
| P1 / small | Active-order errors return `[]`; UI reports no orders | Data outage looks like an empty account | Distinct unavailable, loading and empty states with retry |
| P2 / small | Glows, background grid, gradient buttons, 9–10px labels and numerous rounded cards | Low legibility and weak hierarchy | Semantic tokens, quiet separators, larger labels, tabular numeric typography |

## Candle investigation — observed, not assumed

Read-only POST to the documented dreamDEX GraphQL endpoint at **2026-10-28 22:47 UTC**, BTC pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`:

- 2,000 rows: 1,553 × 60s, 310 × 300s, 104 × 900s, 26 × 3600s, 6 × 14400s and 1 × 86400s; **447 duplicate timestamps**. Baseline query does not filter `intervalSeconds`.
- Maximum high: **90,000 USDso**. No high/low-versus-open/close invariant failures in this sample.
- Native 60s candle at `1793190300`: open **81,042.3**, high **90,000**, low **81,039.1**, close **81,064.4**.
- Indexer Fill `35371600_419`, timestamp `1793190335`, also reports **90,000**, quantity `2985000` BTC atoms. Public transaction: `0x2532174707449130883afd68d0dca5dbd9afca5db380e37116b06e01126fd7b6`.
- Therefore the extreme high is present upstream, not merely a CSS/axis artifact. The indexer evidence is not an independently decoded RPC receipt. The specific screenshot/time range was not supplied, so an exact screenshot match remains unverified.
- Baseline also mixes mark-price samples into fill candles and constructs zero-volume mark candles. Separate the on-chain mark reference from execution OHLC; do not clip, smooth or discard extreme valid prices.

## Existing capabilities and boundaries

- React 19 / TypeScript / Vite / Tailwind 4; Wagmi 2, RainbowKit 2, TanStack Query 5, Radix primitives; Lightweight Charts **4.2.3**, not v5.
- 21 existing verified markets; direct selected-pool mark/index/funding/OI reads; account state/health; cross-market position reads.
- Market IOC and limit submission, tick/lot quantization, 2% IOC crossing buffer, selected sizing leverage, free-collateral check; exact-amount approve then deposit; withdrawals; partial/full close and limit cancellation.
- Client-side reactive guard, hypothetical stress tool, PNG trade-card export, indexed history with RPC/cache fallback exist in code. Their existence does not establish end-to-end correctness.
- Preserve addresses, ABIs, network/RPC settings, wallet providers, signing paths and transaction construction. Any changed data presentation behavior is documented above. No on-chain writes in this task.

## Pre-existing limitations to keep visible

- Selected leverage and position “margin” are locally derived sizing assumptions, not isolated protocol allocations. Cross-margin liquidation requires a portfolio-aware model. Relabel estimates instead of promising safety.
- Guardian health is a selected-market stress approximation, not canonical aggregate account health. Automatic guard is browser-local and requires wallet approval; it is not an on-chain stop.
- Receipt success alone does not establish actual closed quantity. Existing close/guardian handlers do not decode fill sizes. Correct claims; retain fresh position reads as the outcome source.
- Historical cache/RPC fallback is not a complete all-time history; RPC timestamps were fetch time. Do not present cache as live or an empty fallback as verified absence.
- README/status contain historical architecture and HOLD descriptions inconsistent with current code. This redesign does not grant transaction authorization.
- Wallet-backed signing, fresh deposits, cancellation and fills require separate user-approved testnet validation.

## Skills and review

Applied installed `frontend-design` and `web-design-guidelines`. Installed project-local official `vercel-react-best-practices` and `lightweight-charts`; use the actual v4 typings rather than v5 snippets. No application dependency added. Reviewed current Vercel Web Interface Guidelines and official dreamDEX developer documentation.
