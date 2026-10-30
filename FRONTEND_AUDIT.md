# LucidKeeper frontend audit

## Baseline — 30 October 2026

Audited before frontend edits, at `4e55157` on `chore/frontend-self-improve`. The starting worktree was clean. Scope: existing React 19 / Vite / TypeScript terminal, keeping its violet/charcoal brand, Syne/Jakarta/JetBrains typography and trading behavior.

### Checks and evidence

- Build **PASS**, 47.27s; lint and typecheck **PASS**. Existing dependency annotation and chunk-size warnings. Main JS **1,374.16 kB / 427.16 kB gzip**; CSS **71.54 / 14.08 kB** (Vite decimal kB).
- Offline unit selection: all 13 files except `test/dreamdex.test.mjs`: **57 passed, 20 skipped, 0 failed**. The omitted file includes live SDK/RPC/recovery tests; this is not a full `npm test` result.
- Existing real-service read-only Playwright: **8 passed, 6 failed, 16 skipped**. All six failures assume a flat account. The browser instead renders one DOGE short and nonzero maintenance. Original failure traces retained; not frontend regressions.
- Independent browser audit: **4 passed** at **375×812, 768×1024, 1280×900, 1920×1080**. Inspected all four full-page initial screenshots. Also captured Trade, Activity, long market name, invalid collateral, open orders, history, share and Guardian states.
- axe-core **4.11.0**: **0 reported WCAG A/AA violations across 32 state/viewport scans** (WCAG 2, 2.1 and 2.2 tags). Local scanner bytes matched the upstream package SHA-256 `e9e5863c33a874f09bc01acd9234b7e3c871479f5eef8802fa582544465e6d01`. Incomplete/manual checks retained in JSON. Automated success does not establish full WCAG conformance.
- All audited states have zero page-level horizontal overflow. Long `1000PEPE-PERP` and a 39-character quantity were exercised. The positions table intentionally scrolls within its region.
- Modal focus trap / Escape / trigger restoration and activity keyboard navigation pass. Touch help fails at both touch widths; keyboard help works at desktop widths. Share PNG export works with the actual read-only DOGE position.
- No injected wallet, fabricated financial responses, signing or writes. Browser observer reports zero console/page errors and zero blocked write attempts. Browsers access real read-only services; financial values differ between screenshots.

Local evidence: `.git/lucidkeeper-audit/frontend/baseline/` (screenshots and four JSON reports), `frontend-baseline-unit.log`, `frontend-baseline-e2e.log`, and `frontend-baseline-e2e/` (traces). A second `baseline-verified/` pass refines target counting with `checkVisibility` to exclude closed disclosures and modal-hidden backgrounds; initial raw target totals must not be treated as visible-control counts.

## Scores / 10

These are reviewer judgments supported by the observations below, not measured usability or performance percentiles. A 9 requires strong evidence with only minor remaining limitations; scores will not be forced upward to reach the stopping target.

| Area | Before | Evidence / constraint |
| --- | ---: | --- |
| Visual system | 8.0 | Coherent palette/type/spacing; mobile header crowds the wallet action; fallback page uses old colors |
| Originality | 8.0 | Recognizable shield, wordmark, Guardian instrument and execution-centered hierarchy; no user research on differentiation |
| UX psychology | 7.5 | Good grouping and disclosure; tiny actions, touch-inaccessible explanations and stale autonomous metadata undermine clarity |
| Motion | 6.5 | Bounded progress and reduced-motion CSS; price color/background and stress width animate; stock easing |
| Responsiveness | 8.0 | Four widths and long inputs fit; 375px wallet wraps, short desktop form/focus needs stress checks |
| Accessibility | 7.0 | axe clean; labeled controls and trapped dialogs; widespread sub-44px targets, touch help and error-description gaps |
| UI states | 8.0 | Real loading/stale/error/empty separation and retry; invalid collateral explanation unlinked; error boundary inconsistent |
| Performance | 6.5 | Main bundle 427.16kB gzip, external font dependency; layout/paint motion; no real-device or field CWV evidence |
| Code quality | 7.5 | Build/lint/types clean; shared controls and data helpers; dense CSS and large mixed-purpose components |
| Robustness | 7.0 | Read-only flows and long-content pass; six state-dependent browser failures, connected outcomes remain skipped |

## Ranked findings

| ID | Priority | Finding / exact source | Small improvement |
| --- | --- | --- | --- |
| F1 | High | `src/components/HelpTip.tsx`: touch tap exposes no explanation | Controlled tap/keyboard toggle retaining hover and Escape |
| F2 | High | `src/styles/globals.css`: help 24px, presets 27px, icons 36px, range 18–24px; mobile most 38–42px | Shared 44px minimums; preserve a usable scrolling order form |
| F3 | High | `MarginHubModal.tsx`: invalid input describes help, not its visible error | Link the error and announce changes; retain validation logic |
| F4 | Medium | `AnimatedValue.tsx:14`: WAAPI animates color/background | Fade a directional indicator with opacity; keep the exact numeric label |
| F5 | Medium | `RiskGuardian.tsx:599`, CSS stress bar: animated width | Use a fixed-width translated fill, avoiding layout and scale(0) |
| F6 | Medium | CSS global color transitions, gauge/loading/check stock easing | Remove paint transitions; deliberate short custom motion curves |
| F7 | Medium | 375px screenshot: wallet action wraps into two lines | Let narrow header reflow without compressing control text |
| F8 | Medium | Sticky mobile nav; scrollable form/table focus outlines | Test and preserve visible focus with scroll clearance/inset rings |
| F9 | Medium | Long text in flex/grid summary/Guardian/history | Shrinkable children and explicit wrapping; short-height fallback |
| F10 | Medium | HTML metadata calls Guardian autonomous; mixed-language blue error boundary | Align recovery text and metadata with actual browser-local product |
| F11 | Medium | Margin/share options and presets lack group context; nested Use mark button is inside label | Add group names and separate the interactive label action |
| F12 | Medium | History links expose truncated hashes without purpose; OHLC uses single letters | Add descriptive accessible names and semantic UTC time |
| F13 | Medium | Existing browser assertions require a historically flat wallet | Reconcile rendered state against observed real reads rather than freezing balances |
| F14 | Low | Repeated static NumberFlow timing/format config; shared tooltip provider per help item | Hoist stable presentation config / share provider without broad refactor |
| F15 | Low | Share canvas name lists fields but not values; copied state persists across exports | Expose the actual snapshot in accessible text and reset export feedback |

## UX laws applied

- **Fitts:** prioritize larger targets, including help and sliders. **Hick–Hyman:** retain Chart/Trade/Activity and progressive margin breakdown instead of adding navigation.
- **Miller / chunking:** preserve market, account, order and Guardian group boundaries. **Gestalt proximity/common region/similarity:** reuse shared control sizes and labels without flattening financial hierarchy.
- **Jakob:** keep familiar terminal order entry, native inputs, Radix dialogs/tabs and normal browser navigation. **Doherty:** feedback should be immediate; data loading remains truthful and recoverable rather than artificially delayed.
- **Tesler:** disclose financial complexity next to its control rather than removing it. **Postel / error prevention:** tolerate long display strings while retaining strict numeric validation.
- **Aesthetic–usability:** polish supports readability; it does not substantiate safety/performance claims. **Von Restorff:** reserve violet for primary actions/reference data and semantic colors for direction/warnings.
- **Serial position / peak–end:** keep the order summary and submission outcome clear; confirmation must remain distinct from fill. **Zeigarnik:** expose waiting/error progress without manipulative urgency.
- **Occam / Pareto:** choose reusable low-risk fixes before architecture or visual redesign. **Goal gradient:** show real progress only; no invented execution completion.

## WCAG and resilience coverage

Checked: names/roles/value, contrast automation, keyboard activation, visible focus baseline, dialog escape, skip link, no page overflow, labels, selected-state semantics, reduced-motion CSS and honest read states. The requested **44×44 CSS px** target is stricter than WCAG 2.2 AA's usual **24×24** criterion; axe passing does not satisfy that user target. Incomplete contrast/canvas results require human review. Screen-reader operation, browser zoom/text spacing, pointer alternatives for chart gestures, real-device GPU behavior and connected-wallet outcomes require additional evidence.

## Bounded implementation plan

Up to five iterations of 3–5 separately committed, evidence-backed improvements. Each iteration reruns build/lint/typecheck, the offline suite, read-only browser checks and four viewport captures. Record self-critique and all ten scores in `IMPROVEMENT_LOG.md`. Stop at all scores ≥9, two consecutive iterations without meaningful gain, or the five-iteration cap. Preserve the brand and request user direction before any subjective redesign.
