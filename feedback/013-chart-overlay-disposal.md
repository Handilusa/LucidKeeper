# Chart overlay cleanup repaints a disposed series

Severity: Medium — an uncaught rendering error when switching markets with position overlays.
Area: LucidKeeper frontend lifecycle; reproduced locally, not evidence of a dreamDEX protocol defect or a bounty submission.

## Steps to reproduce
1. Open the local production preview with an actual nonzero position in the displayed market.
2. Wait for its Entry / estimated liquidation overlays, then select another market.
3. Observe the next animation frame. Repeat after returning to the position market.

## Expected
Chart removal disposes its overlays and no later operation uses that chart's series.

## Actual
On 30 October 2026, the browser reported `Error: Object is disposed`. Instrumented native animation-frame scheduling traced it to the position effect's `series.removePriceLine` cleanup running after `api.remove()`. Market-switch reproduction also failed without axe instrumentation. Actual observed BTC and DOGE shorts supplied the overlays; no financial responses were fabricated.

## Evidence
- Preserved local audit: `.git/lucidkeeper-audit/frontend/iteration-5-diagnose/1280.json`.
- Scheduling stack: `.git/lucidkeeper-audit/frontend/iteration-5-diagnose-frames-details/market-lifecycle.json` (real pinned block `0x23b4c15`).
- Fix: only remove individual lines while `candles.current` still owns that series. Whole-chart disposal already removes them.
- Regression: `test/e2e/chart-lifecycle.spec.ts` selects an actually observed position and switches away twice. Flat-account runs explicitly skip this position-dependent case.
- Verified 30 October 2026: build/lint/typecheck and offline subset **57 passed / 20 skipped**; real-service browser suite **15 passed / 16 skipped**, including the twice-switched position regression. Final four-width audit and isolated recovery **8 passed**, zero page errors. No wallet connection or transaction was performed.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1; `lightweight-charts` 4.2.3; React 19.
- Network: Somnia Tokyo testnet, chain ID 50383; real read-only RPC/indexer.
- Public account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`, disconnected preview.
- Browser / OS: Playwright Chromium 156, Windows; local Vite production preview.
- Status: local fix and regression verified; no publication or submission.
