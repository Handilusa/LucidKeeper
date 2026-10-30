# Frontend improvement log

## Method — 30 October 2026

Baseline and ranked findings: [FRONTEND_AUDIT.md](FRONTEND_AUDIT.md). Branch `chore/frontend-self-improve`, starting clean at `4e55157`. Each iteration has 3–5 atomic improvements, build/lint/typecheck, the **13-file offline subset** (excluding `dreamdex.test.mjs`), and real-service read-only browser checks at 375, 768, 1280 and 1920px. Local screenshots/JSON/logs: `.git/lucidkeeper-audit/frontend/`. Scores are reviewer judgments, not usability study results. No publication or live transactions.

## Scores / 10

| Area | Before | Iteration 1 | Iteration 2 | Iteration 3 |
| --- | ---: | ---: | ---: | ---: |
| Visual system | 8 | 8 | 8 | 8.5 |
| Originality | 8 | 8 | 8 | 8 |
| UX psychology | 7.5 | 8 | 8 | 8.5 |
| Motion | 6.5 | 6.5 | 8.5 | 8.5 |
| Responsiveness | 8 | 8 | 8 | 8.5 |
| Accessibility | 7 | 8.5 | 8.5 | 8.5 |
| UI states | 8 | 8.5 | 8.5 | 8.5 |
| Performance | 6.5 | 6.5 | 7 | 7 |
| Code quality | 7.5 | 7.5 | 8 | 8 |
| Robustness | 7 | 7.5 | 7.5 | 8 |

## Iteration 1 — reachable controls and input feedback

- `2ad2183` — F1: touch help opens/closes from pointer-down state, preserving hover, focus and Escape. An initial toggle failed because touch focus opened before click; fixed and explicitly verified repeated taps.
- `af8872a` — F2: 44px targets, wrapping presets/toolbars, bounded market dropdown, leverage inside the scrolling fields. Refined baseline initial-state sub-44px counts **24/25/58/58 → 0/0/0/0**, including the skip link; no sub-44px controls across all 36 recorded states. Counts include rendered controls outside the viewport and exclude closed disclosures/inert backgrounds.
- `ff58fd5` — F3: collateral error is part of the input's accessible description and a polite live region. Actual negative-input validation remains unchanged.

**Verification:** `iteration-1-verified`: build/lint/typecheck pass; offline **57 passed / 20 skipped / 0 failed**; browser **4 passed**; **32 axe scans, zero violations**, all four widths and nine states without page overflow. Touch repeat-toggle, Escape, modal focus trap/restoration, keyboard tabs, 21 markets, long quantity and real DOGE PNG download pass. Initial and verified screenshots inspected; increased control sizes preserve the visual hierarchy. Main JS remains approximately **427.2kB gzip**.

**Self-critique:** this trades compactness for reachability. The short-height order form still needs a dedicated focus/scroll check; the 375px wallet text still wraps. No claim of complete WCAG conformance: actual screen readers and connected-wallet outcomes remain unverified. Motion and bundle findings remain. Meaningful gain: touch help, target sizing and error linkage.

## Iteration 2 — cheaper, bounded motion

- `59fec7d` — F4 / part of F14: price flash uses a 200ms opacity layer, preserving exact numeric accessible text. Repeated updates cancel the prior effect; changing reduced-motion preference cancels it immediately. NumberFlow timing/format objects are stable, with a custom curve and 160ms opacity timing.
- `977cc8e` — F5: full-width stress fill translates in its clipped track instead of animating width. Scenario math and warning thresholds are unchanged.
- `0c81b03` — F6: removed global color/background/border transitions; gauge/check use `cubic-bezier(0.23, 1, 0.32, 1)`, 200/180ms. Confirmation starts at .95 scale. Loading/spinner retain bounded constant-speed cycles (1.2/.9s); these indicate waiting rather than delaying an interaction.

**Verification:** `iteration-2`: build/lint/typecheck pass; offline **57/20/0**; browser **4 passed**, all 36 states meet measured 44px targets/no overflow, **32 axe scans with zero violations**. Computed stress/gauge transition properties are `transform`; reduced-motion settles to zero running document animations at every width. Four-width screenshots inspected, including Trade, chart, margin and expanded Guardian.

**Self-critique:** removal of layout/paint animation is verified in source and computed styles; screenshots cannot prove frame rate. A real mid-range phone/GPU recording and third-party shadow-animation audit remain needed. The large initial bundle still dominates the performance score. Meaningful gain: less per-frame layout/paint work and deliberate interruption/reduced-motion behavior.

## Iteration 3 — responsive reading and focus

- `656a121` — F7: narrow header wraps its two groups naturally; wallet text remains one line and all actions remain present.
- `82a0454` — F8: scroll clearance accounts for sticky mobile navigation, inset focus rings in clipping regions, and Guardian navigation focuses its summary. Short desktop windows and expanded margin breakdown use document scrolling, preventing a zero-height fields region.
- `b3f4861` — F9: shrinkable account grids and wrapping summary/history/Guardian labels preserve long-content readability.

**Verification:** `iteration-3`: build/lint/typecheck pass; offline **57/20/0**; four-width browser **4 passed**, **32 axe scans / zero violations**, zero small targets/page overflow. All order inputs are fully visible when focused at **1280×600**, including after expanding margin breakdown. Guardian summary receives focus, is fully in the viewport and clears mobile navigation at both touch widths. Wallet label is one line at every width; screenshots inspected at all four widths and the additional short window.

**Self-critique:** a two-row 375px header uses 50px more vertical space; it improves legibility rather than hiding branding or network context. Long numeric entry remains horizontally scrollable inside its input. Programmatic focus/geometry checks are not a substitute for screen-reader testing; zoom/text-spacing stress remains for final verification. Meaningful gain: reachable short-window fields and unobscured destination focus.
