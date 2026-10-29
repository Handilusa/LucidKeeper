---
version: alpha
name: LucidKeeper
description: Source-backed inventory of the current trading-terminal worktree, not a deployment or completed QA claim.
colors:
  primary: "#70d4df"
  secondary: "#9aa5b3"
  neutral: "#101316"
  panel: "#171b20"
  surface: "#20262c"
  border: "#2d343c"
  border-highlight: "#45515e"
  text: "#e6ebf0"
  positive: "#60cf9f"
  negative: "#f4808b"
  warning: "#e5b875"
  button-hover: "#29313a"
  primary-hover: "#91e2ea"
  buy-foreground: "#101b16"
  sell-foreground: "#231216"
typography:
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
  numeric:
    fontFamily: JetBrains Mono
    fontSize: 13px
  wordmark:
    fontFamily: Syne
    fontSize: 22px
    fontWeight: 800
    letterSpacing: "-1px"
  panel-heading:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: 700
  market-price:
    fontFamily: JetBrains Mono
    fontSize: 23px
    letterSpacing: "-0.7px"
  input:
    fontFamily: JetBrains Mono
    fontSize: 14px
rounded:
  badge: 3px
  icon: 4px
  control: 5px
  menu: 6px
  modal: 8px
spacing:
  compact: 4px
  control-block: 8px
  field-inline: 12px
  button-inline: 13px
  toolbar-inline: 16px
  order-inline: 18px
  panel: 20px
  page: 24px
  header-inline: 28px
  wide-page: 32px
components:
  panel:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
  button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    height: 36px
  button-hover:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.text}"
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.neutral}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.neutral}"
  submit-buy:
    backgroundColor: "{colors.positive}"
    textColor: "{colors.buy-foreground}"
    rounded: "{rounded.control}"
    height: 44px
  submit-sell:
    backgroundColor: "{colors.negative}"
    textColor: "{colors.sell-foreground}"
    rounded: "{rounded.control}"
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  tooltip:
    backgroundColor: "{colors.button-hover}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  modal:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.modal}"
---

## Overview

Observed **29 October 2026**, starting Git HEAD `dc49658`, with inherited, uncommitted frontend changes. This file describes the implementation on disk. It does **not** say that the redesign is committed, deployed, accessible in every state, or passing its current tests.

The frontend brief is the immutable `../prompt_frontend.txt`. This document is its implementation inventory, not a replacement. The app folder is the repository root; paths below are relative to it. Previously written audit/plan documents remain in `docs/LUCIDKEEPER_UX_AUDIT.md` and `docs/LUCIDKEEPER_REDESIGN_PLAN.md`; their dated measurements are historical evidence, not new observations.

**Built direction: the quiet execution desk.** A continuous chart/execution workspace replaces equal-weight balance cards. Graphite surfaces, precise numeric typography, restrained cyan selection, and explicit buy/sell labels establish hierarchy. Available margin sits beside execution; wallet assets, bank collateral and STT gas remain distinct. Risk controls are progressively disclosed without presenting browser-local triggers as on-chain stops.

**Implementation authority:** `src/styles/globals.css` owns shared CSS tokens and layout; component-owned chart/canvas/provider constants are documented separately below. YAML aliases mirror actual source values; they do not introduce new runtime tokens. `height` in the component inventory represents the implemented minimum height where CSS uses `min-height`.

## Colors

| Role | Runtime token / owner | Built value | Purpose |
| --- | --- | --- | --- |
| Base | `--bg-base` | `#101316` | Page foundation; unselected control groups |
| Panel | `--bg-panel` | `#171b20` | Continuous workspace, chart overlays, dialogs |
| Raised surface | `--bg-surface` | `#20262c` | Inputs and secondary controls |
| Separator | `--border-color` | `#2d343c` | Section grouping, not independent decorative cards |
| Highlighted border | `--border-highlight` | `#45515e` | Hover, menus and overlays |
| Primary text | `--text` | `#e6ebf0` | Readable labels and values |
| Secondary text | `--muted` | `#9aa5b3` | Context, units and secondary labels |
| Action / focus | `--color-cyan` | `#70d4df` | Selected controls, links, available margin, focus |
| Long / positive | `--color-emerald` | `#60cf9f` | Buy side, positive change, rising candles |
| Short / negative | `--color-rose` | `#f4808b` | Sell side, negative change, falling candles |
| Warning | `--color-amber` | `#e5b875` | Testnet context and unavailable/unsafe conditions |

`@theme` maps Tailwind cyan-400/500, emerald-400/500, rose-400/500, and slate-400/500 to the corresponding shared palette. Other utility color shades are **not** remapped.

Local CSS values are intentional parts of the current inventory, not additional global tokens: neutral hover `#29313a`, primary hover `#91e2ea`, buy foreground `#101b16`, sell foreground `#231216`, network alert `#38262b`, instrument icon `#262d34`, selection `#70d4df40`, selected timeframe/preset `#70d4df15`, subtle table hover `#ffffff02`, and testnet badge border `#e5b87550`.

**Chart adapter** (`src/features/terminal/Chart.tsx`): panel/muted/up/down/accent values mirror the palette as literal chart options. Horizontal grid `#252c33`; vertical grid hidden; crosshair `#687581` and label background `#35414d`. Volume colors `#60cf9f35` / `#f4808b35`. The mark reference is cyan and dashed, distinct from execution-price candles.

**Current exceptions:** Sonner in `src/app/Providers.tsx` still uses background `#0d131d`, border `#1a2536`, text `#e2e8f0`; RainbowKit uses the shared cyan/dark foreground with its own medium radius, system font and small overlay blur. RiskGuardian and ErrorBoundary retain older utility surfaces/shades; risk wrapper CSS normalizes only specified descendants. Do not describe full token adoption as done.

## Typography

Fonts load through Google Fonts with `display=swap` in `index.html`; network-dependent font loading falls back to the declared stacks.

| Role | Built mapping | Notes |
| --- | --- | --- |
| UI | `--font-sans`: Plus Jakarta Sans, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif | Body 13px; ordinary controls/labels generally 11–14px |
| Numeric | `--font-mono`: JetBrains Mono, monospace | `.numeric` and `.font-mono` use tabular numerals; prices, quantities, balances and percentages |
| Brand | `--font-display`: Syne, sans-serif | Desktop wordmark 22px/800, -1px tracking; instrument name 20px/700 |
| Key mark price | `.market-stat.primary dd` | Desktop 23px; compact workspace 25px |
| Inputs | `.input-wrap input` | Desktop 14px; compact workspace 16px |
| Headings | `.panel-heading h2`, `.modal-title` | 14px/700 and 19px/700 respectively |
| Supporting text | `.form-note`, `.modal-description`, `.help-content` | Explicit line heights 1.65, 1.65 and 1.6 respectively |

Do not infer a global type scale or line-height token: those are not defined. The footer and some compact testnet/market labels still use 9–10px; these remain accessibility review targets.

**Formatting as built:** `src/lib/math/format.ts:formatDynamicPrice` uses six decimal places below 0.0001, four below 1, three below 10, and en-US formatting with one to two decimals otherwise. Callers render unavailable values as `—` or `Unavailable` rather than displaying missing data as a market zero. This helper is not itself a data-validity guarantee and can round very small nonzero prices to zero; tick-aware formatting needs review. Chart axis precision/minimum move derive from the market tick size. Chart timestamps are UTC; activity history currently uses browser-local date/time. Funding labels retain the 8h interval and directional values have text/signs as well as color.

## Layout

Source: `src/styles/globals.css` and `src/app/App.tsx`.

1. Global header: 60px desktop height, 28px horizontal padding; brand, in-page Trade/Activity/Risk navigation, unmistakable TESTNET context, existing RainbowKit connection actions.
2. Market strip: minimum 82px; instrument selector and primary mark, followed by index, 24h change, funding/8h and open interest. Source/freshness text is separate from the network label.
3. Main terminal: maximum 1800px wide, centered, 24px side/bottom padding. One bordered panel contains a fluid chart/activity column and a 356px execution rail. At 1550px and above, rail is 380px and terminal side padding is 32px.
4. Chart sits in the left top cell; account summary and activity tabs sit below it. Order entry spans both rows on the right. Section separators, not individual rounded cards, define hierarchy.
5. Order entry: 16px top/bottom and 18px side padding; desktop sticky top 16px, maximum height `calc(100dvh - 160px)`. Only `.order-fields` scrolls; summary, margin availability and primary action stay in the nonshrinking footer. Fields must not hide the pre-trade costs or action.
6. Chart viewport: `clamp(300px, 39vh, 440px)` desktop; 330px compact, 430px tablet. Lightweight Charts auto-resizes to the available container.
7. Account summary: four distinct balances, four-column desktop grid, two-column phone grid; it remains with activity, not among market statistics.
8. Risk tools: persistent mounted component inside a `<details>` disclosure below the workspace. Collapsing presentation must not imply a trigger is disarmed.
9. Tables: right-aligned numeric columns, first column left-aligned; overflow is scoped to keyboard-focusable horizontal regions instead of the page.

**Spacing as implemented:** recurring values include 4/8/12/16/18/20/24/28/32px; several precise local gaps and paddings remain. `--space-panel: 20px` is declared but not generally consumed. There is no complete reusable spacing-token scale yet. The YAML spacing entries document actual values, not a claim that every component uses CSS variables.

### Responsive breakpoints actually in CSS

| Query | Implemented behavior |
| --- | --- |
| `min-width: 1550px` | Wider execution rail and page gutters |
| `max-width: 1100px` | Tighter header/market gaps; hides secondary network/source details, subject to later compact overrides |
| `min-width: 1024px` and `max-width: 1200px` | Chart toolbar wraps timeframes to a separate row; tighter primary-price spacing |
| `max-width: 1023px` | Single-area Chart / Trade / Activity navigation; global nav hidden; compact market grid; static full-height order form; no execution-rail scroll container |
| `min-width: 768px` and `max-width: 1023px` | Five-column market stats, four-column balances, 430px chart, order form capped at 620px |
| `max-width: 420px` | Smaller wordmark/header gaps and wallet-button padding |

The existing plan mentioned mobile navigation below 768px; **actual CSS switches below 1024px**. Follow the built breakpoint unless deliberately changing it. `data-mobile-view` hides areas with CSS rather than unmounting them, preserving chart/form state when switching views. Market changes intentionally remount the chart via its pool-address key.

Desktop button minimum is 36px, icon controls 36px square, timeframe controls 34×32px, side controls 37px minimum, presets 27px minimum, order-type controls 40px and submit 44px minimum. Compact minima are 40px buttons/icons/presets, 42px side controls, 44px order-type controls, 40×38px timeframes and 46px workspace navigation. These are the built sizes, **not** a blanket claim of 44px touch targets.

## Elevation & Depth

The terminal uses flat surfaces and 1px separators. No general elevation token is implemented. Exact overlay shadows in global CSS:

| Element | Shadow / stacking |
| --- | --- |
| Market select | `0 16px 48px #0008`; z-index 60 |
| Help tooltip | `0 8px 20px #0005`; z-index 100 |
| Dialog | `0 24px 100px #0009`; z-index 71 |
| Dialog backdrop | `#0009`; z-index 70 |
| Skip link | z-index 100 |
| Compact workspace nav | Sticky top 0; z-index 10 |

Active navigation uses thin cyan box-shadow underlines (1–2px), not ambient glow. Risk wrapper removes specified glow classes and the root panel shadow. Third-party wallet overlays keep their existing provider styles; layering still needs browser verification.

## Shapes

Built radii: badge/item 3px, icon/timeframe 4px, shared control/input/preset group 5px, market menu 6px, dialog 8px. Instrument badge and help trigger are circular. Main workspace is rectangular; risk root is normalized to radius 0. Some RiskGuardian/ErrorBoundary utilities still retain larger radii; this is incomplete adoption, not a new shared token.

## Components

| Product concept | Implementation file | Built responsibility / shared styles |
| --- | --- | --- |
| App composition | `src/app/App.tsx` | Query-derived market/account state, workspace view, wrong-network alert, risk disclosure, modal ownership |
| App header | `src/features/terminal/AppHeader.tsx` | Brand SVG/wordmark, actual anchor navigation, TESTNET badge, RainbowKit actions; `.app-header`, `.brand`, `.button` |
| Market context | `src/features/terminal/MarketHeader.tsx` | Radix Select, formatted market metrics, contextual explanations, source status; `.market-strip`, `.market-stat`, `.select-*` |
| Account funds | `src/features/terminal/AccountSummary.tsx` | Explicit connected/read-only identity; wallet USDso, unlocked bank collateral, available margin, STT gas; `.account-*` |
| Execution chart | `src/features/terminal/Chart.tsx` | Lightweight Charts v4 lifecycle, native intervals, OHLC inspection, keyboard inspection/zoom, reset, independent mark line and loading/error/empty states; `.chart-*` |
| Order entry | `src/features/trade/TradingBox.tsx` | Side → type → limit price → quantity → margin budget → sizing leverage; estimated cost/fees/margin, unavailable liquidation, local validation and existing handler; `.order-*`, `.field-*`, `.summary-row`, `.submit-order` |
| Trading activity | `src/features/portfolio/PositionsTable.tsx` | Radix positions/orders/history tabs, explicit data errors, existing close/cancel actions, partial-close dialog, history pagination; `.activity-tabs`, `.trading-table`, `.history-row` |
| Risk controls | `src/features/sentinel/RiskGuardian.tsx` | Existing browser-local trigger/stress controls with visible limitations; wrapper rules in globals normalize older utility styling |
| Collateral dialog | `src/features/margin/MarginHubModal.tsx` | Existing deposit/withdraw workflows with labeled amount and feedback, using shared Modal |
| Position sharing | `src/features/share/TradeCardModal.tsx` | Shared dialog; 1200×675 canvas snapshot, PNG/clipboard/X actions; not proof of realized PnL or independent receipt verification |
| Contextual help | `src/components/HelpTip.tsx` | Radix Tooltip, accessible `About …` button; `.help-trigger`, `.help-content` |
| Shared dialog | `src/components/Modal.tsx` | Radix Dialog, title/description, close control, focus-return handling; `.modal-*` |
| Wallet / feedback providers | `src/app/Providers.tsx` | Existing Wagmi/Query/RainbowKit/Sonner setup and component-owned visual exceptions |
| Error recovery | `src/components/common/ErrorBoundary.tsx` | Existing recovery UI; older palette/large-card utility styling remains |
| Entry / fonts | `src/main.tsx`, `index.html` | Provider/error boundary mounting, global stylesheet, remote font loading |

**Chart data boundary:** `src/lib/data/indexer.ts` and `src/lib/data/candles.ts` provide candle mapping/validation. Existing audit records an upstream 90,000 USDso execution high; that evidence was not independently re-fetched in this docs task. Preserve valid extremes. Do not merge mark-price samples into execution OHLC, clip wicks or invent missing buckets to satisfy the visual design.

**Share-canvas exception:** dark canvas matches panel/text/muted/accent colors; light export uses background `#f2f4f6`, text `#171b20`, muted `#52606f` and separator `#c4ccd4`. This is a light **export**, not an implemented light terminal theme. Related hashes and pool addresses are labeled as such, not as verified performance.

## Do's and Don'ts

- Keep chart, order preparation, pre-trade estimates and available funds visually primary; secondary account/risk detail uses grouping and disclosure.
- Preserve visible TESTNET identity and explicit connected versus read-only account context.
- Pair semantic colors with side labels, signs, warnings and status text. A positive-colored value or successful receipt alone is not proof of a fill.
- Show missing/stale/failed data honestly. Sizing leverage is a local assumption; margin budget is not a maximum-loss guarantee; unreliable liquidation remains unavailable.
- Keep wallet assets, bank collateral, free margin and native gas conceptually separate.
- Do not silently alter contracts, addresses, ABIs, chain/RPC settings, trading API boundaries, signing flows or financial semantics for visual polish.
- Do not add inert controls, fake market data, secret material, decorative urgency, continuous glows or animated backgrounds.
- Refresh this inventory whenever implemented tokens, components, motion or breakpoints change. Commit working increments with their checkpoint/history documents; never push without a separate user request.

## Motion and interaction

`--motion: 150ms` controls button/link color, background-color and border-color transitions. Focus outline is 2px cyan with 3px offset; input focus uses a -2px offset, and invalid input uses a 1px rose outline plus validation text. Disabled buttons use opacity 0.45 and a not-allowed cursor.

HelpTip has a **200ms reveal delay**, not a 200ms animation. Chart, activity and order-type switching currently use immediate state changes rather than invented entrance animations. No dedicated price-flash animation exists in the inspected terminal.

Risk wrapper disables `.animate-ping` / `.animate-pulse`, removes gradient imagery and suppresses specified glows. The stress gauge still has `transition-all duration-300` and a dynamic width: **300ms dimensional motion remains an exception**. Existing utility state transitions may also use their own defaults. A global `prefers-reduced-motion: reduce` rule disables animations/transitions and sets scroll behavior to auto. Do not claim every interaction follows 150ms or that third-party overlays have been audited.

## Validation status and remaining design work

This initial design inventory is documentation-only. It does not rerun or supersede historical frontend test/build/Lighthouse claims.

Documentation validation on 29 October 2026: `npx -y -p @google/design.md designmd lint docs/DESIGN.md` returned 0 errors and 3 orphan-token warnings (`border`, `border-highlight`, `warning`); no modeled-component contrast warnings. These tokens are used in the documented CSS, but are not referenced by the frontmatter's limited component model. They remain in the inventory rather than adding fictional component properties to silence the linter.

The CLI's DTCG export is [design.tokens.json](design.tokens.json). It is a generated documentation artifact, not consumed by the app. Regenerate with `npx -y -p @google/design.md designmd export --format dtcg docs/DESIGN.md` after changing normative tokens. Lint separately: a successful export alone does not validate contrast or accessibility.

Resumption check on 29 October 2026, 14:19 CET: the existing local documentation validator passed. All 15 exported colors match the inventory and CSS; 19 referenced source paths, all seven CSS breakpoint values and seven local documentation links resolve. The 51-file source/test/config/prompt preservation baseline and three append-only histories match. The recorded CLI lint report above was inspected, not rerun in this resumption.

The inherited Playwright suite contains fixture-based scenarios at 1440×900, 1280×800, 390×844, 768×1024 and 1024×800. Isolated test fixtures are not live market evidence. Live read-only browser QA, console/overflow checks, keyboard/reduced-motion checks and any user-approved financial lifecycle validation remain separate requirements.

Exact first frontend task after this documentation commit: **run `npm run typecheck` on the inherited redesign before editing application code**, then the existing unit/lint/build/E2E gates. Record actual failures in CHECKPOINT and fix the first reproduced defect with its matching test. Do not restart completed source work from a blank design.

Open design concerns: incomplete shared-token adoption, small supporting labels/touch targets, tick-aware numeric formatting, residual dimensional motion, and browser verification of sticky execution/footer focus behavior and modal layering. Update `docs/LUCIDKEEPER_REDESIGN_VALIDATION.md` only with checks actually performed.
