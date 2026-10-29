---
version: alpha
name: LucidKeeper
description: Source-backed inventory of the current trading-terminal worktree, not a deployment or completed QA claim.
colors:
  primary: "#771be8"
  primary-foreground: "#f5f5f5"
  violet-text: "#bc93f3"
  secondary: "#a8a8a8"
  neutral: "#070707"
  panel: "#111111"
  surface: "#252525"
  border: "#252525"
  border-highlight: "#4c4c4c"
  text: "#e6e6e6"
  positive: "#60cf9f"
  negative: "#f4808b"
  warning: "#e5b875"
  button-hover: "#303030"
  primary-hover: "#8535ec"
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
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.primary-foreground}"
  submit-buy:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: 44px
  submit-sell:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    height: 44px
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  tooltip:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
  modal:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.text}"
    rounded: "{rounded.modal}"
---

## Overview

Updated **29 October 2026**, screenshot-correction starting HEAD `968746b`. This inventory describes the local source. Current checks and deployment differences are recorded in [validation](LUCIDKEEPER_REDESIGN_VALIDATION.md); local changes are not deployed.

The frontend brief is the immutable `../prompt_frontend.txt`. This document is its implementation inventory, not a replacement. The app folder is the repository root; paths below are relative to it. Previously written audit/plan documents remain in `docs/LUCIDKEEPER_UX_AUDIT.md` and `docs/LUCIDKEEPER_REDESIGN_PLAN.md`; their dated measurements are historical evidence, not new observations.

**Built direction: Guardian-first execution desk.** The signature semicircular cross-margin gauge occupies the top-left workspace row. The execution rail begins alongside it, keeping side, type and prominent leverage above scrolling quantity/budget fields. Somnia violet carries identity, actions and Guardian; green/red carry direction and PnL; amber carries warnings. Wallet assets, bank collateral, available margin and STT gas remain distinct. Advanced browser-local controls are progressively disclosed.

**Implementation authority:** `src/styles/globals.css` owns shared CSS tokens and layout; component-owned chart/canvas/provider constants are documented separately below. YAML aliases mirror actual source values; they do not introduce new runtime tokens. `height` in the component inventory represents the implemented minimum height where CSS uses `min-height`.

## Colors

| Role | Runtime token / owner | Built value | Purpose |
| --- | --- | --- | --- |
| Base | `--bg-base` | `#070707` | Page foundation; unselected control groups |
| Panel | `--bg-panel` | `#111111` | Continuous workspace, chart overlays, dialogs |
| Raised surface | `--bg-surface` | `#252525` | Inputs and secondary controls |
| Separator | `--border-color` | `#252525` | Section grouping |
| Highlighted border | `--border-highlight` | `#4c4c4c` | Hover, menus and overlays |
| Primary text | `--text` | `#e6e6e6` | Readable labels and values |
| Secondary text | `--muted` | `#a8a8a8` | Context, units and secondary labels |
| Official Somnia purple | `--color-violet` | `#771be8` | Actions, branding, Guardian gauge |
| Readable violet | `--color-cyan` compatibility alias | `#bc93f3` | Derived text tint, links and focus |
| Long / positive | `--color-emerald` | `#60cf9f` | Buy side, positive change, rising candles |
| Short / negative | `--color-rose` | `#f4808b` | Sell side, negative change, falling candles |
| Warning | `--color-amber` | `#e5b875` | Testnet context and unavailable/unsafe conditions |

`@theme` maps violet/cyan compatibility utilities, emerald/rose direction utilities and slate neutrals to shared values. The readable violet tint is derived, not an official brandbook swatch. See [asset provenance](../public/assets/README.md) for the official kit and eleven original CC0 token SVGs. Missing token assets use initial circles; USDso never borrows a different stablecoin logo.

Local CSS values include neutral hover `#303030`, primary hover `#8535ec`, action foreground `#f5f5f5`, buy-selector foreground `#101b16`, sell-selector foreground `#231216`, selection `#771be840`, selected timeframe/preset `#771be81f`, subtle table hover `#ffffff02`, and testnet badge border `#e5b87550`.

**Chart adapter** (`src/features/terminal/Chart.tsx`): panel/muted/up/down values mirror CSS as chart options. Horizontal grid and label background `#252525`; vertical grid hidden; crosshair `#777777`. Volume colors `#60cf9f35` / `#f4808b35`. Mark is violet/dashed; Last follows candle direction; entry is neutral/dotted; estimated portfolio liquidation is amber/dashed.

Sonner and RainbowKit use the violet/neutral palette with provider-owned radius/font behavior. Advanced Guardian uses compact two-column sections, violet actions and amber warnings, stacking below 1024px. Some inherited utilities and ErrorBoundary retain local styling; CSS compatibility aliases normalize the active terminal.

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

**Formatting as built:** `formatDynamicPrice` uses adaptive precision below 0.0001 (at least six decimals), four below 1, three below 10, and en-US formatting with one to two decimals otherwise. Mark/axis precision derives from the market tick. NumberFlow values expose formatted accessible labels rather than rolling shadow-DOM digits. Missing data renders `—`; real zeros remain zeros. Chart/freshness timestamps are UTC; history uses browser-local time. Funding normalizes the contract calculation window to eight hours; settlement frequency is not the rate window.

## Layout

Source: `src/styles/globals.css` and `src/app/App.tsx`.

1. Global header: 60px desktop height, 28px horizontal padding; brand, in-page Trade/Activity/Risk navigation, unmistakable TESTNET context, existing RainbowKit connection actions.
2. Market strip: minimum 82px; instrument selector and primary mark, followed by index, 24h change, funding/8h and open interest. Source/freshness text is separate from the network label.
3. Main terminal: maximum 1800px wide, centered, 24px side/bottom padding. One bordered panel contains a fluid chart/activity column and a 356px execution rail. At 1550px and above, rail is 380px and terminal side padding is 32px.
4. Guardian occupies row one, chart row two and account/activity row three. Order entry spans all three on the right. Guardian remains mounted and visible in every compact workspace tab.
5. Order entry: 16px top/bottom and 18px side padding; desktop sticky top 16px, maximum height `calc(100dvh - 160px)`. Only `.order-fields` scrolls; side/type/leverage remain above it, costs and submit remain below it. Standalone liquidation has a separate scenario label and assumption tooltip.
6. Chart viewport: `clamp(300px, 39vh, 440px)` desktop; 330px compact, 430px tablet. Lightweight Charts auto-resizes to the available container.
7. Account summary: four distinct balances, four-column desktop grid, two-column phone grid; it remains with activity, not among market statistics.
8. Advanced risk tools remain mounted inside `<details>`. Collapsing does not disarm; reload/account/network changes do. Saved thresholds are account/network/market-scoped, with explicit re-arming. The actual portfolio gauge stays in the main workspace.
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

Active navigation uses thin violet underlines (1–2px), without ambient glow. Overlay layering and focus are covered by fixture modal tests and rendered QA.

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
| Order entry | `src/features/trade/TradingBox.tsx` | Persistent side/type/leverage; quantity/budget; verified fees, standalone liquidation, current-read gates, simulation and wallet/receipt feedback |
| Trading activity | `src/features/portfolio/PositionsTable.tsx` | Radix positions/orders/history tabs, explicit data errors, existing close/cancel actions, partial-close dialog, history pagination; `.activity-tabs`, `.trading-table`, `.history-row` |
| Guardian overview | `src/features/sentinel/GuardianOverview.tsx` | Always-visible semicircular gauge, same-block equity/maintenance, explicit no-exposure/unavailable/loading states |
| Risk controls | `src/features/sentinel/RiskGuardian.tsx` | Compact browser-local controls; account-scoped thresholds, hypothetical stress, wallet-approved lot-rounded exits |
| Display states | `src/components/AnimatedValue.tsx`, `Freshness.tsx`, `ReadValue.tsx`, `LoadingState.tsx` | Numeric animation/accessibility, timestamped freshness, retained cached values and bounded loading |
| Token identity | `src/components/TokenLogo.tsx` | Local licensed SVGs, initial-circle fallback and consistent BTC identity |
| Collateral dialog | `src/features/margin/MarginHubModal.tsx` | Existing deposit/withdraw workflows with labeled amount and feedback, using shared Modal |
| Position sharing | `src/features/share/TradeCardModal.tsx` | Shared dialog; 1200×675 canvas snapshot, PNG/clipboard/X actions; not proof of realized PnL or independent receipt verification |
| Contextual help | `src/components/HelpTip.tsx` | Radix Tooltip, accessible `About …` button; `.help-trigger`, `.help-content` |
| Shared dialog | `src/components/Modal.tsx` | Radix Dialog, title/description, close control, focus-return handling; `.modal-*` |
| Wallet / feedback providers | `src/app/Providers.tsx` | Existing Wagmi/Query/RainbowKit/Sonner setup and component-owned visual exceptions |
| Error recovery | `src/components/common/ErrorBoundary.tsx` | Existing recovery UI; older palette/large-card utility styling remains |
| Entry / fonts | `src/main.tsx`, `index.html` | Provider/error boundary mounting, global stylesheet, remote font loading |

**Chart data boundary:** `indexer.ts`/`candles.ts` validate native interval OHLCV without adding mark samples. `chartScale.ts` derives robust bounds using median/deviation, every body and current mark. An `autoscaleInfoProvider` affects only the view. The disclosure counts candles beyond those bounds, not fills; chart margins can make some boundary wicks visible. Full range delegates to the library's original provider and is reversible. Cursor/keyboard inspection preserves original OHLC. Position overlays use a single-block account-health/position/mark/parameter snapshot and disappear on failed/stale reads.

**Share-canvas exception:** dark canvas matches panel/text/muted/accent colors; light export uses background `#f2f4f6`, text `#171b20`, muted `#52606f` and separator `#c4ccd4`. This is a light **export**, not an implemented light terminal theme. Related hashes and pool addresses are labeled as such, not as verified performance.

## Do's and Don'ts

- Keep Guardian health, chart, order preparation, pre-trade estimates and available funds visually primary; advanced risk detail uses disclosure.
- Preserve visible TESTNET identity and explicit connected versus read-only account context.
- Pair semantic colors with side labels, signs, warnings and status text. A positive-colored value or successful receipt alone is not proof of a fill.
- Retain account/chain-scoped cached balances with “Stale” on failed refresh; never authorize execution from display retention. Sizing leverage is a local assumption; margin budget is not a maximum-loss guarantee. Standalone liquidation assumes the entered execution price and verified maintenance/entry taker fee, separately from actual cross-margin liquidation.
- Keep wallet assets, bank collateral, free margin and native gas conceptually separate.
- Do not silently alter contracts, addresses, ABIs, chain/RPC settings, trading API boundaries, signing flows or financial semantics for visual polish.
- Do not add inert controls, fake market data, secret material, decorative urgency, continuous glows or animated backgrounds.
- Refresh this inventory whenever implemented tokens, components, motion or breakpoints change. Commit working increments with their checkpoint/history documents; never push without a separate user request.

## Motion and interaction

`--motion: 150ms` controls button/link color/background/border transitions. Focus is 2px readable violet with 3px offset; invalid inputs pair outline and text. Disabled buttons use opacity 0.45.

HelpTip has a **200ms reveal delay**. NumberFlow estimates/mark transition in 200ms. Real price changes trigger a 300ms directional flash (green up, red down); equal values and initial renders do not flash. Wallet pending, receipt pending, confirmation and rejection have distinct feedback. Confirmation never implies a fill.

Gauge needle/stress changes take 200ms. Loading indicators animate at most 3.6s, state spinners at most 4.5s; a read still pending after 12s offers explicit recovery. Global reduced-motion disables CSS animation/transitions; NumberFlow honors the preference and price-flash code checks it before animating. No ambient loops.

## Validation status and remaining design work

Current application, browser, accessibility and deployed comparison results are in [LUCIDKEEPER_REDESIGN_VALIDATION.md](LUCIDKEEPER_REDESIGN_VALIDATION.md). Historical Lighthouse totals are not current results.

Documentation validation on 29 October 2026: `npx -y -p @google/design.md designmd lint docs/DESIGN.md` returned 0 errors and 3 orphan-token warnings (`border`, `border-highlight`, `warning`); no modeled-component contrast warnings. These tokens are used in the documented CSS, but are not referenced by the frontmatter's limited component model. They remain in the inventory rather than adding fictional component properties to silence the linter.

The CLI's DTCG export is [design.tokens.json](design.tokens.json). It is a generated documentation artifact, not consumed by the app. Regenerate with `npx -y -p @google/design.md designmd export --format dtcg docs/DESIGN.md` after changing normative tokens. Lint separately: a successful export alone does not validate contrast or accessibility.

Resumption check on 29 October 2026, 14:19 CET: the existing local documentation validator passed. All 15 exported colors match the inventory and CSS; 19 referenced source paths, all seven CSS breakpoint values and seven local documentation links resolve. The 51-file source/test/config/prompt preservation baseline and three append-only histories match. The recorded CLI lint report above was inspected, not rerun in this resumption.

The inherited Playwright suite contains fixture-based scenarios at 1440×900, 1280×800, 390×844, 768×1024 and 1024×800. Isolated test fixtures are not live market evidence. Live read-only browser QA, console/overflow checks, keyboard/reduced-motion checks and any user-approved financial lifecycle validation remain separate requirements.

Resume with CHECKPOINT's current NEXT. The inherited typecheck and subsequent correction gates were run; do not restart from the historical documentation-only first step.

Remaining constraints: remote fonts have system fallbacks, dense supporting labels remain 10–12px, the terminal has no light theme, and live wallet/transaction lifecycle validation requires a separate approved user session. Local rendering and deterministic fixtures do not prove deployed parity.
