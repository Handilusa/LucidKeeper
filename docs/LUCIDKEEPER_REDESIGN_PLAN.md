# LucidKeeper trading workspace

28 October 2026 — implementation brief for the first coherent redesign.

## Direction: the quiet execution desk

The trader's job is to inspect a market, size an order, review margin and manage the result. Use a continuous workspace with a narrow execution rail, not equal-weight dashboard cards. The signature is the relationship between **market → order → available margin**: the instrument anchors the top strip, side gives the order rail its only directional accent, and spendable margin is prominent immediately beside execution.

Considered a three-column desk with a market watchlist. Rejected it: there is no live multi-market ticker feed and it would compress the chart. Retain one spacious chart and one execution rail using the actual available data.

```text
LucidKeeper      Trade / Activity / Risk       Tokyo TESTNET     Wallet
Market selector  Mark       Index    24h     Funding / 8h     OI
┌──────────────────────────────────────────┬────────────────────────┐
│ Timeframes / OHLC                        │ Buy / Sell             │
│                                          │ Market / Limit         │
│ Execution-price chart + mark reference    │ Quantity / margin      │
│                                          │ Sizing leverage        │
├──────────────────────────────────────────┤ Estimate breakdown     │
│ Account · wallet collateral · bank · gas │ Available margin       │
├──────────────────────────────────────────┤ Execute / tx status    │
│ Positions / Open orders / Trade history  │                        │
└──────────────────────────────────────────┴────────────────────────┘
Risk Guardian ▸  expandable, with browser-local limitation visible
```

Mobile: compact brand/wallet header, persistent testnet context, market/mark first, secondary statistics wrap into a compact grid. Chart / Trade / Activity workspace navigation shows one purposeful area at a time. Preserve mounted chart/form/guardian state; never stop an armed guard by switching presentation tabs. Account funds sit with activity; actionable margin remains in order entry.

## Tokens

- Graphite `#101316`, panel `#171b20`, raised input `#20262c`, separator `#2d343c`.
- Primary text `#e6ebf0`, secondary `#9aa5b3`; cyan `#70d4df` for focus/selection.
- Long `#60cf9f`, short `#f4808b`, caution `#e5b875`; text/labels accompany color.
- Existing Syne for the compact wordmark, Plus Jakarta Sans for readable UI, JetBrains Mono for numeric values. Real CSS font mappings, tabular numerals.
- Spacing 4/8/12/16/24px; compact 4–8px radii; 36–40px controls (44px mobile), 2px focus rings; 150ms color/opacity transitions; reduced-motion support.
- Desktop ≥1024px: fluid chart with 356px execution rail; mobile <768px: single-area navigation; intermediate layouts wrap without page overflow.

## Component responsibilities

- `AppHeader`: brand, actual in-page navigation, environment and existing RainbowKit actions.
- `MarketHeader`: accessible market selection and formatted market context only.
- `AccountSummary`: explicit read-only/connected identity, separate wallet/bank/gas balances and unavailable states.
- `Chart`: installed v4 chart lifecycle, autosizing, timeframe, OHLC inspection, reset view, separate mark line, loading/error/empty/stale states.
- `TradingBox`: retain transaction handler and sizing math; reorganize controls, label estimates, validate inputs, truthful transaction feedback.
- `PositionsTable`: accessible tabs, numeric table alignment, truthful loading/error/account states, existing management actions.
- `RiskGuardian`: progressively disclosed existing controls with clear simulation/local-execution labels.
- Shared `HelpTip` and `Modal`: use installed Radix for focus, Escape and keyboard behavior.

## Sequence and acceptance

1. Document source-backed audit and chart finding.
2. Establish tokens, shell, market strip and account grouping.
3. Correct demonstrated chart-data mapping faults without altering valid OHLC; add regression tests for intervals, decimals and data errors.
4. Reorganize order entry and activity; remove unsupported safety/fill claims and improve validation.
5. Apply consistent modal, keyboard, responsive and state behavior.
6. Run existing tests, TypeScript, ESLint, production build and available Chromium visual/interaction checks at 1440×900, 1280×800, 390×844. Test disconnected, error, empty, stale and market-switch behavior. Use explicitly isolated fixtures for automated input tests; use real public reads for live visual checks. No signing or sends.

Results and remaining limitations are recorded in `LUCIDKEEPER_REDESIGN_VALIDATION.md` when checks complete.
