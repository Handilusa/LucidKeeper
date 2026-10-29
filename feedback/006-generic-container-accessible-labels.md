# Named chart/order groups use generic containers

- **Severity:** Low — confirmed markup gap; assistive-technology impact requires manual verification.
- **Area:** Frontend accessibility / group semantics.
- **Observed:** 29 October 2026, 15:53–15:55 UTC, deployed desktop and phone audit plus matching source inspection.
- **Environment:** `https://lucid-keeper.vercel.app/`; Chromium 156.0.8078.4 on Windows; markets SDK 0.32.1; Somnia Tokyo 50383; public bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`, read-only and disconnected.
- **Reproduction:** Inspect `.timeframes`, `.scale-toggle`, `.chart-ohlc`, `.chart-reference`, `.side-control` and `.order-types`. Each puts `aria-label` on a generic `div` without a role supporting an accessible name. The WCAG-tagged axe run reports these under **incomplete/manual-review** `aria-prohibited-attr`, not its automatic violation list.
- **Expected:** Intended named groups use appropriate semantic elements or a supported group role, while individual controls retain their names and keyboard behavior.
- **Actual:** Generic containers have unsupported naming attributes. Source locations: `src/features/terminal/Chart.tsx:208,235,242,257`; `src/features/trade/TradingBox.tsx:345,357`. Individual button/tab/candle keyboard checks passed; no screen-reader session was run. Zero automatic axe violations is not full accessibility compliance.
- **Evidence:** [Current validation](../docs/LUCIDKEEPER_REDESIGN_VALIDATION.md), and `accessibility` entries in local `.git/lucidkeeper-audit/settled-deployed-2026-10-29T15-53-19-687Z/report.json`.
- **Follow-up:** Review suitable semantics, then verify the accessibility tree and actual screen-reader grouping. No source fix was included in this documentation-only QA completion. Separate axe contrast and modal-focus incomplete items remain manual-review limitations; they are not automatically confirmed defects.
