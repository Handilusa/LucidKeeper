# LucidKeeper redesign validation

**Observed:** 29 October 2026. **Scope:** local React/Vite source and production preview, plus the separately dated deployed read-only QA below. Node 24.19.0, Windows, Chromium, markets SDK 0.32.1, Lightweight Charts 4.2.3. Repository: `dream-sentinel/`, branch `main`.

**Outcome:** local unit/type/lint/build and all 27 fixture scenarios pass. After the user's deployment confirmation, **40/40 deployed read-only protocol assertions pass**, with current Reown configuration and accessible-group naming follow-ups recorded below. No wallet connection, guard arming, signatures, on-chain writes or push by this QA session. Publication recorded in inherited `e755984` is separate.

## Commit evidence

- Existing implementation and inherited staged documentation saved as eight explicit-path commits: `7c0b103`, `00ebc74`, `59acbb0`, `5151454`, `efbf92d`, `0e7550e`, `0513d6f`, `da2301e`.
- After `da2301e`, `git status --porcelain=v1 --untracked-files=all` returned empty. No inherited work discarded or unstaged.
- Violet DTCG export and current DESIGN lint recorded in `aa3a24b`. Current documentation commit is obtained with `git rev-parse HEAD`; no self-referential hash is embedded here.

## Commands actually run

Application/design results below were recorded earlier on 29 October; they were not rerun for the final documentation-only increment.

| Check | Current result |
| --- | --- |
| `npm test` | **65/65 PASS**, offline public fixtures/mocks |
| `npm run typecheck` | **PASS**, no TypeScript errors |
| `npm run lint` | **PASS**, no ESLint findings |
| Build within `npm run test:e2e` | **PASS**, 39.89s; third-party annotation and >500kB chunk warnings |
| First combined build/E2E command | Harness timeout at 120s after scenarios 1–21 passed; not a complete browser result |
| `npx playwright test --project=chromium` | **27/27 PASS**, 2.1m, 240s harness allowance; same already-built production preview |
| `designmd export --format dtcg docs/DESIGN.md` via `npx -y -p @google/design.md` | **PASS**, CLI 0.4.0, 17 colors |
| Local `verify-violet-export.mjs` | **PASS**, stored JSON equals CLI JSON; all 17 colors match DESIGN and CSS |
| `designmd lint docs/DESIGN.md` via the same package | **0 errors, 9 orphan-token warnings**; no modeled-component contrast warnings |
| `git diff --check` / `git diff --cached --check` | **PASS** for completion changes and each staged increment |
| Step-3 `node scripts/scan-secrets.mjs` | Initially passed; then **exited 1** for the unallowlisted public indexed-fill hash in UX audit line 27/worktree/history. This historical result was not green |
| Final `node .git/lucidkeeper-audit/verify-settled-docs-2026-10-29.mjs` | **PASS**, 29 October 16:12 UTC: 40 passing recorded assertions, 15 matching assets, 11 valid local links, exactly five documentation/feedback paths staged, zero runtime changes |
| Final `git diff --cached --check` | **PASS**, exit 0, no whitespace findings |
| Final `node scripts/scan-secrets.mjs` | **PASS**, exit 0, zero findings in tracked worktree files and added lines from the latest 100 commits; ignored memory/audit/secret files excluded; existing patterns/allowlist unchanged |

The scanner's generic 32-byte pattern does not distinguish transaction hashes from keys. The audit labels `0x25321747…26fd7b6` as an indexed-fill transaction; that historical observation was not independently reverified here. Subsequent inherited commit `abce76c` added that hash to the scanner allowlist; inherited release `e755984` records a zero-findings rerun. This QA session did not change the scanner or signing policy.

## Browser coverage and rendered inspection

All browser scenarios use `test/e2e/terminal-fixture.ts`: external RPC/indexer/font/analytics requests are intercepted, the injected wallet is a transport double, and simulated transaction requests never reach a real wallet or network.

| Area | Verified locally |
| --- | --- |
| Market and sizing | BTC/ETH/DOGE switching, correct units/native intervals, side/type/leverage, invalid/blank inputs, tick/lot/minimums, Max and budget disclosure |
| Liquidation and funding | Standalone preview without a position, side/leverage changes, invalid-input absence; calculation-window normalization, failed fee/parameter reads fail closed |
| Account reads | Cached balances retained through failed refresh with stale state, recovery, account isolation, unavailable initial reads, stale inputs block execution |
| Guardian and overlays | Always-visible overview, health/position/parameter reads pinned to one block, threshold settings isolated by account/network |
| Chart | Original OHLC preserved, robust outlier candle disclosure, reversible full range, keyboard inspection/UTC, loading/error/retry/empty/old executions |
| Activity and dialogs | Empty versus unavailable reads, paginated cache isolation, keyboard tabs, modal focus/Escape/return focus, share canvas/PNG |
| Transaction feedback | Mock approve-receipt-deposit sequencing and reverts; rejection, submission and confirmation distinct from fills; failed simulation stops before wallet request |
| Motion | Directional price feedback, bounded animations, reduced motion and slow-read recovery |

Responsive scenarios passed at **1440×900, 1280×800, 390×844, 768×1024 and 1024×800**: no document-width overflow or page errors, Guardian visible, mobile tab state retained and table actions reachable within their scoped horizontal region. Desktop leverage, fee, total and submit controls remained in view.

Inspected newly generated local fixture screenshots at 1440, 1280 and the 390px Trade view. Violet hierarchy, separate account funds, Last/Mark references and prominent leverage/Guardian are rendered. At 1280×800, lower sizing fields scroll while the estimate/submit footer remains visible; phone trading uses vertical scrolling, not desktop-rail clipping. Fixture fonts are intercepted, so these screenshots **do not validate actual Google Font delivery**. Screenshots remain under `.git/lucidkeeper-audit/`, outside publication files.

## Limits and remaining checks

- Standalone liquidation is a labeled sizing assumption, not an actual cross-margin liquidation guarantee. Portfolio estimates hold other markets constant; stale cached balances never authorize execution.
- Robust bounds affect the view only. Disclosure counts candles beyond bounds, not executions or exact clipped pixels; original OHLC/full range remain available. Distant entry/liquidation lines can be outside the robust viewport.
- No new live financial lifecycle, fill decoding, wallet signing or allowance/deposit/close/cancel correctness was certified. Mock receipts are not on-chain evidence.
- Current real-font delivery and limited axe/keyboard checks are recorded below; no full accessibility certification, Lighthouse score or production performance certification. DESIGN lint checks only its modeled pairs; dense labels/small targets and incomplete shared-token adoption remain documented in [DESIGN](DESIGN.md).
- Older local/public parity artifacts record Reown localhost-origin errors and differing build assets. They are historical diagnostics, not current deployed QA. Do not rerun the existing mixed local/deployed parity script before confirmation.

## Step 4 — deployed settled-data QA completed

**Gate released by the user:** “done its already deployed”. Observed **29 October 2026, 15:53:19–15:55:07 UTC**, Chromium **156.0.8078.4**, fresh contexts at **1440×900, 1280×800, 390×844, 768×1024 and 1024×800**. Requested/effective URL in every context: `https://lucid-keeper.vercel.app/`; HTTP **200**.

### Deployment content and evidence

- Audited local HEAD: `e755984ff205fa5b226b1bfc5c8f79dd55fbb6d9`. Served HTML and **all 15 observed JS/CSS assets match local `dist/` byte-for-byte by SHA-256**, not just by filename. The app exposes no independently verified deployment commit ID; content parity does not establish Vercel commit provenance.
- Main `index-WhQt3hfy.js`: **1,366,707 bytes**, SHA-256 `28da89683e5d67d99dc2cc9ffd25ed03b3ff04c2fe85e756fe6ab22cd4e0d52c`.
- CSS `index-CO7lO2oJ.css`: **83,030 bytes**, SHA-256 `b88cf981f567dcb51a60d7f2a835e00fc2cfa4fe8b494a27ecacfb2b2ae69d3a`.
- New local evidence: `.git/lucidkeeper-audit/settled-deployed-2026-10-29T15-53-19-687Z/{report,summary}.json` and its screenshots. Script: `.git/lucidkeeper-audit/settled-deployed-2026-10-29.mjs`. Audit files remain Git metadata, not publication files.
- First run at 15:50–15:52 is preserved separately: seven false failures from asserting text on a correctly absent loading overlay, plus an OHLC whitespace-comparison failure. Corrected only the audit assertions, then reran fresh contexts: **40 passed, zero failed**. No app source was changed.
- Focused chart/focus supplement: `.git/lucidkeeper-audit/settled-focused-2026-10-29T16-01-44-071Z/`; its screenshots certify chart scaling only, not settled account health. It preserved original BTC OHLC across full/robust views with eight disclosed outlier candles and passed 24 consecutive forward/backward modal Tab checks plus Escape/return focus.

### Actual settled values and refreshes

Waited for individual RPC/GraphQL results and disappearance of loading states, then stable `.animated-value` **accessible labels**; polling `networkidle` and NumberFlow's shadow digit text were not used as numeric evidence. Each selected market had at least two successful mark/index/funding/funding-parameter/pool-parameter/OI reads and candle refreshes. `getOneBase` was read once per market (cached); the 60s 24h query completed once per short market observation window, not twice.

| Market | First / second observation UTC | Mark: first → second | Second index | 24h snapshot | Funding / 8h | Second OI |
| --- | --- | --- | --- | --- | --- | --- |
| BTC | 15:53:23.526 / 15:53:37.872 | 81,625.3 → 81,637.9 | 81,670.37 | +0.78% | +0.0901% | 28.26M |
| ETH | 15:53:41.717 / 15:54:09.220 | 2,364.26 → 2,363.74 | 2,364.69 | +0.50% | +0.0100% | 2.69M |
| DOGE | 15:54:11.199 / 15:54:40.649 | 0.08037 → 0.08036 | 0.0804 | +0.96% | +0.0100% | 160.33K |

Prices/notional use USDso. Displayed marks, funding and OI agree with captured decoded contract responses; index formatting and 24h values agree with their RPC/hourly-candle evidence. Funding calculation windows were **28,800 seconds**; all three pools returned **takerFeeBpsTimes1k = 0**, matching the **0.000% / 0.0000** fee display. Zero is a successful read, not an unavailable-value fallback.

- Public read-only bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`: **187.00 USDso wallet assets, 12.43 USDso bank collateral, 12.43 USDso available margin, 89.8329 STT gas**. Captured raw collateral/equity was 12.428353319904202 USDso. Gas/wallet/account refreshes succeeded; these are dated balances, not funding authorization.
- **Zero active positions, zero maintenance**: Guardian truthfully shows “No maintenance exposure” with an absent ratio, not an invented infinite safety factor. Pinned account/state/position/pool reads were observed; no live position overlay or position-management lifecycle could be exercised with this empty account.
- Open orders query returned **0**; history returned **13 Fill / 16 MarginEvent** rows and displayed indexed activity. History is indexer-read evidence, not a new independent receipt audit.
- All three 1h charts returned **300 valid native candles**, last bucket **15:00 UTC**, with Last distinct from Mark. BTC Last changed **81,869.5 → 81,757.6** on refresh; this is execution close, not an oracle substitution. DOGE 5m requested interval **300** and keyboard Home/End exposed original OHLC/UTC. BTC's robust view disclosed **8** outlier candles; full range visibly restored the high wick near 90,000 without modifying OHLC.
- No decoded RPC/GraphQL errors or invalid candle responses in the settled run. Initial-error/stale recovery paths were **not naturally observed or artificially injected on deployment**; earlier isolated fixture coverage remains the evidence for those states.

### Rendering, accessibility and follow-ups

- Five sizes: document width equals viewport width; Guardian remains visible. Desktop leverage/fee/total/submit footer is in view. Phone Trade/Activity switching preserves local input state and scrolls vertically; layout/modal/risk screenshots were inspected, including new BTC/ETH/DOGE desktop, 1280 desktop and phone Trade/Activity/risk views.
- Keyboard market selector exposes **21** options; activity tabs work; chart Home/End and scale toggles work; collateral modal closes with Escape and restores its trigger. Disconnected collateral submission and guard arming are disabled. No wallet connector, arming button or transaction action was clicked.
- **Real Google Fonts pass:** stylesheet and WOFF2 responses HTTP 200; browser platform-font inspection confirms **Plus Jakarta Sans**, **Syne** and **JetBrains Mono** on rendered instrument/Guardian/numeric text in all five contexts. This is separate from fixture-font evidence.
- WCAG 2/2.1/2.2 A/AA-tagged axe on desktop chart/modal/risk and phone chart/trade/modal/risk: **zero automatic violations**. **Incomplete** checks remain: unsupported labels on generic containers, NumberFlow/SVG contrast, and hidden-background focus during a modal. The focused supplement confirms actual Tab containment; this does not resolve every manual accessibility check or certify compliance.
- **Current reproduced integration issue:** Reown config and WalletConnect telemetry return **403** in all five contexts; console explicitly says the production origin is not on its allowlist. Read-only data still succeeds; wallet connection impact was not tested. See [feedback 005](../feedback/005-production-reown-origin-allowlist.md).
- **Confirmed markup follow-up:** named chart/order containers use unsupported `aria-label` on generic `div`s; axe classifies them as incomplete, and source inspection confirms the missing semantics. See [feedback 006](../feedback/006-generic-container-accessible-labels.md). No screen-reader session or source fix performed.
- Request cancellations were retained in evidence. The focused trace identified one aborted same-origin **HEAD fetch**, not a failed app document load. Additional RPC aborts occurred during interactions; their exact causes are not established, and successful settled refreshes are recorded separately. **Zero page exceptions**; console is **not clean** because of the Reown issue.
- Still outside scope: real wallet connection, signing, financial lifecycle/fill correctness, nonempty live portfolio overlays, connected-only action reachability, full screen-reader/manual accessibility and performance certification. No writes/signatures were attempted; the protective route log contains **zero blocked write attempts**. No push.

## Separately authorized Reown configuration follow-up — 29 October 2026

- Replaced the shared development Project ID default with the user-supplied public ID `006c638cc6ec95a3982952a1ee86aa05`; retained `VITE_WALLETCONNECT_PROJECT_ID` override. No financial/UI/accessibility logic or cloud settings changed.
- Fresh **65/65 unit tests, typecheck, ESLint and production build PASS** (49.01s; existing dependency/chunk warnings). These checks were rerun for this configuration increment, unlike the earlier documentation-only commit.
- Focused local production-preview audit **16:33:09–16:33:12 UTC: 5/5 PASS**. Actual config request carries the supplied ID and returns **200**, telemetry **202**; market/account reads settle disconnected. No console errors/page exceptions/write attempts. Evidence: `.git/lucidkeeper-audit/reown-local-2026-10-29T16-33-09-033Z/`.
- User reconfirmed redeployment, but fresh production audit **16:33:09–16:33:12 UTC: 2/5 PASS**: effective URL/document200 and disconnected reads pass; config-ID, config200 and error-free integration checks fail. Actual config+telemetry requests still carry old ID `3fcc6bba2d1de962d911bb5b5c3dba68` and return403. Evidence: `.git/lucidkeeper-audit/reown-deployed-2026-10-29T16-33-09-008Z/`. Local code success does not establish live resolution; [feedback 005](../feedback/005-production-reown-origin-allowlist.md) remains open.
- Earlier 16:29 run preserved; corrected an audit-only expectation that the disconnected Connect wallet to trade affordance be disabled. No source change to that button. New focused runs do not repeat the full 40-assertion/five-size QA; earlier parity describes the earlier `dist/`, not this rebuilt output. No actual environment files inspected, Vercel login, wallet connection, signatures, transactions or push.

### Production resolution confirmed — 29 October 2026, 20:34 UTC

- Fresh Chromium read-only run **20:34:19–20:34:25 UTC: 5/5 PASS**. Effective production URL/document200; live config and telemetry use supplied ID `006c638cc6ec95a3982952a1ee86aa05`, returning **200** and **202** respectively. Market/account reads settle disconnected; no console/page errors or write attempts. Evidence: `.git/lucidkeeper-audit/reown-deployed-2026-10-29T20-34-19-332Z/report.json`.
- [Feedback005](../feedback/005-production-reown-origin-allowlist.md) now resolved for production configuration only. Earlier 16:33 failures remain historical. No actual wallet connection/signing, full five-size QA, application test/build rerun or new SHA-256 parity claim; no source/cloud changes or push. Exact deployment/cache/propagation cause was not established.

## Authorized accessibility-group fix 006 — 29 October 2026

- Source diff is exactly six `role="group"` additions in Chart/TradingBox. Existing accessible names, buttons, pressed states, OHLC live setting, keyboard handlers, trading logic and CSS remain unchanged. Reown configuration untouched.
- Fresh **65/65 offline unit tests, typecheck and ESLint PASS**. Production build **PASS (12.61s)**; existing dependency annotation/large-chunk warnings remain. Two new disconnected desktop/phone name-and-keyboard tests fail against the existing pre-fix `dist/`, then pass after rebuilding.
- Post-fix **6/6 focused Chromium scenarios PASS (9.9s)**: market switching/native candles, chart failed/empty/old reads, both new group/Tab/Shift+Tab/Enter/Space regressions, chart OHLC keyboard inspection and side/leverage liquidation preview. Full 29-scenario suite was not run: wallet connection, write and armed-guard scenarios are excluded from this QA authorization.
- Independent local production-preview AX/axe inspection **2/2 PASS (4.5s)**, **20:46:49–20:46:51 UTC**, Chromium **156.0.8078.4**, axe **4.11.0**. Both 1440×900 and 390×844 expose all six exact group names as non-ignored Chromium AX `group` nodes; phone Chart and Trade views inspected separately. All six containers explicitly pass `aria-prohibited-attr`; scoped violations/incomplete results **zero**.
- WCAG-tagged document runs: **zero automatic violations**; `color-contrast` incomplete nodes remain **34 desktop / 14 phone Chart / 28 phone Trade**. NumberFlow/SVG/manual contrast limitations remain; modal-focus and actual screen-reader testing were not rerun. No full accessibility certification.
- New reports/snapshots/screenshots: `.git/lucidkeeper-audit/groups-006-1440-2026-10-29T20-46-49-255Z/` and `groups-006-390-2026-10-29T20-46-50-359Z/`. Inspected all three renders with isolated fonts; no deployed font/content parity claim. Local verifier checks six-role-only source changes, explicit axe passes, evidence and documentation links.
- [Feedback 006](../feedback/006-generic-container-accessible-labels.md) is **fixed locally; production verification pending**. No connected wallet, simulation, send, page exception or unexpected fixture request in the new regressions/AX inspections. No arming, claims, signatures, transactions, cloud changes, deployment or push.
- Final exact seven-path staging/source/evidence check and **13 local documentation links PASS**; staged whitespace **PASS**. Unchanged supplemental scanner **exits 0, zero findings**, tracked worktree/latest 100 commits only. Ignored local memory/audits remain excluded; save this reviewed increment locally without pushing.
