# Named chart/order groups use generic containers

**Status:** Fixed and verified locally, **29 October 2026, 20:46 UTC**. Deployment and screen-reader verification remain pending; historical production observations below are preserved.

- **Severity:** Low — confirmed markup gap; assistive-technology impact requires manual verification.
- **Area:** Frontend accessibility / group semantics.
- **Observed:** 29 October 2026, 15:53–15:55 UTC, deployed desktop and phone audit plus matching source inspection.
- **Environment:** `https://lucid-keeper.vercel.app/`; Chromium 156.0.8078.4 on Windows; markets SDK 0.32.1; Somnia Tokyo 50383; public bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`, read-only and disconnected.
- **Reproduction:** Inspect `.timeframes`, `.scale-toggle`, `.chart-ohlc`, `.chart-reference`, `.side-control` and `.order-types`. Each puts `aria-label` on a generic `div` without a role supporting an accessible name. The WCAG-tagged axe run reports these under **incomplete/manual-review** `aria-prohibited-attr`, not its automatic violation list.
- **Expected:** Intended named groups use appropriate semantic elements or a supported group role, while individual controls retain their names and keyboard behavior.
- **Actual:** Generic containers have unsupported naming attributes. Source locations: `src/features/terminal/Chart.tsx:208,235,242,257`; `src/features/trade/TradingBox.tsx:345,357`. Individual button/tab/candle keyboard checks passed; no screen-reader session was run. Zero automatic axe violations is not full accessibility compliance.
- **Evidence:** [Current validation](../docs/LUCIDKEEPER_REDESIGN_VALIDATION.md), and `accessibility` entries in local `.git/lucidkeeper-audit/settled-deployed-2026-10-29T15-53-19-687Z/report.json`.
- **Follow-up:** Review suitable semantics, then verify the accessibility tree and actual screen-reader grouping. No source fix was included in this documentation-only QA completion. Separate axe contrast and modal-focus incomplete items remain manual-review limitations; they are not automatically confirmed defects.

## Authorized local resolution — 29 October 2026

- Added `role="group"` to exactly the six affected containers. Retained all six existing accessible names, ordinary buttons, `aria-pressed`, OHLC `aria-live="off"`, keyboard handlers and styling. No trading logic, wallet configuration or layout changed.
- Two new isolated regressions at **1440×900** and **390×844** fail against the pre-fix build and pass against the rebuilt production preview. They verify exact group names, no added focus stops, Tab/Shift+Tab order, Enter/Space activation, pressed states, native candle requests and limit-field visibility without connecting a wallet or submitting an order.
- Fresh **65/65 unit tests, typecheck, ESLint, production build and 6/6 focused Chromium scenarios PASS**. Independent AX/axe inspection **2/2 PASS**, Chromium **156.0.8078.4**, axe **4.11.0**, local preview `http://127.0.0.1:4174/`, SDK **0.32.1**, Tokyo **50383**, public bounty EOA unchanged and disconnected; RPC/indexer/fonts/analytics are isolated test fixtures, not live protocol evidence.
- At **20:46:49–20:46:51 UTC**, all six exact names appear as non-ignored `group` nodes in Chromium's accessibility tree on both sizes (phone Chart/Trade views separately). Each affected container explicitly passes `aria-prohibited-attr`; scoped violations and incomplete results are both **zero**. WCAG-tagged document runs have **zero automatic violations**, but contrast incomplete/manual-review nodes remain: **34 desktop, 14 phone Chart, 28 phone Trade**. Modal focus and actual screen-reader announcement were not retested; this is not full accessibility certification.
- Evidence: local `.git/lucidkeeper-audit/groups-006-1440-2026-10-29T20-46-49-255Z/report.json` and `groups-006-390-2026-10-29T20-46-50-359Z/report.json`, accessibility snapshots and three new screenshots. Inspected desktop and phone Chart/Trade renders; screenshots use isolated fonts and do not claim live font/content parity.
- Production fix not verified or published by this task. No wallet connection, guard arming, claims, signatures, transactions or push. After user deployment confirmation, a separate read-only production check can verify the served semantics; screen-reader coverage remains separate.
