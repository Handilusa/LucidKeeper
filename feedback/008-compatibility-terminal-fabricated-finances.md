# Retained compatibility terminal presents fabricated current financial state

Severity: High — confirmed runtime data-integrity failure on a retained startup path; not a dreamDEX protocol defect.
Area: App / compatibility HTML / startup

The Reproduction/Actual sections preserve the pre-fix finding; local resolution below supersedes them. Newer code is not certified deployed.

## Reproduction
1. Inspect `public/index.html:135-235,464-495,592-624`.
2. Inspect `scripts/ui-server.mjs:14,169-176` and the `dev` / `ui` scripts in `package.json`.
3. In a checkout without `dist/`, those scripts serve the retained `public/index.html`. No build folder was removed or wallet operation attempted to reproduce this condition.

## Expected
Show verified current account/market state or explicit unavailable/loading/error states. Historical transactions must not be presented as a current position. Missing reads must not produce invented balances.

## Actual
HTML embeds STT `89.96`, wallet USDso `198.00`, margin `2.00`, a `0.00013 BTC` long with `5.2x` leverage, entry/mark `79,946.0`, and fixed book/risk values. JavaScript initializes the same position/price and substitutes numeric fallback balances. Its share card reproduces fixed finances.

The active built/deployed entry is the React SPA: this review did **not** observe those compatibility numbers on the production React homepage. The defect is in tracked runtime HTML reachable without a build. Real historical hashes do not make its fixed current-state presentation truthful.

## Evidence
30 October 2026 source inspection. Public reads at block `37084078` instead observed wallet `187` USDso, MarginBank `12.428353319904201956` USDso, gas `89.832899658` STT and no active pools. Local evidence: `.git/lucidkeeper-audit/completion-2026-10-30/report.json`. No transaction sent.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet, chain 50383
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; read-only, no connected wallet
- Runtime / OS: Node 24.19.0 / Windows
- Status: Fixed locally on 2026-10-30; not submitted

## Recommended next action
The compatibility view now consumes real `/api/status` strings, starts with unavailable/loading values and clears failed reads. Fixed position, PnL, book sizes, risk and card code removed; historical evidence linked with an explicit date. `test/compatibility.test.mjs` guards the empty initial state. Latest local suite 56 pass / 21 skip and real-service Chromium 14 pass / 16 skip, zero failures; this browser suite exercises the React SPA, not a separate compatibility-browser lifecycle. No live transaction.
