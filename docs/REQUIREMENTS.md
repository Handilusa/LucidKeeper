# LucidKeeper — Requirements & Acceptance Checklist (REQUIREMENTS.md)

**Bounty Target:** dreamDEX Perps Builder Bounty (Somnia Tokyo Testnet, Chain ID 50383).  
**Deadline:** 1 November 2026, 23:59 UTC.  
**Rule:** No requirement is marked as completed without verifiable linked evidence.

---

## 1. Phase 0 Production Baseline Audit (15-Minute Clean Wallet Test)

**Historical baseline, 28 October 2026 — not current application status or permission to reproduce write flows.** Earlier recorded audit against `https://lucid-keeper.vercel.app/` follows unchanged. The authoritative reconciliation is below; later implementation supersedes missing-feature claims, but fixtures do not certify production transactions.

| Step | Action & Flow | Expected Result | Production Status | Failure Root Cause / Gap |
| :--- | :--- | :--- | :--- | :--- |
| **01** | **Conectar Wallet** | Connect via RainbowKit modal (MetaMask, Rabby, OKX) | **PASS** | Successfully prompts connection, binds address, loads STT & USDso balances. |
| **02** | **Red Incorrecta** | Switch wallet to another network (e.g. Sepolia, Mainnet) | **PASS** | Header displays `Wrong Network (Switch to Tokyo)`, opens chain modal to Tokyo (50383). |
| **03** | **Cambiar Mercado** | Select from 21 perp markets (BTC, DOGE, SOL, etc.) | **PASS** | Dropdown displays all 21 markets, loads on-chain `tryGetMarkPrice()` per pool. |
| **04** | **Depositar Margen** | Input 2.0 USDso in Margin Hub and submit deposit | **FAIL** | `MarginHubModal.tsx` fires `approve` and `deposit` sequentially without waiting for `approve` receipt confirmation. In fresh wallets, `deposit` reverts or wallet throws during `eth_estimateGas` because on-chain allowance is still 0. |
| **05** | **Abrir Posición** | Open Market (IOC) Long/Short with leverage | **PASS (IOC) / PARTIAL (Limit)** | IOC executes and fills against book with 2% slippage. Resting limit orders do not display in UI. |
| **06** | **Ver Gráfico** | Inspect TradingView chart across intervals (1m-1d) | **PARTIAL** | Shows real indexer OHLCV candles, but open candle is not updated with mark price via `series.update()`. Testnet has temporal candle gaps. |
| **07** | **Cerrar Posición** | Click "Close (Sell/Buy IOC)" in Positions table | **PASS** | 100% position closed via IOC with 2% crossing slippage; confirmed on Tokyo. |
| **08** | **PnL en MarginBank** | Inspect MarginBank unlocked collateral balance | **PASS** | MarginBank updates `unlockedCollateralBalance` on 3s poll reflecting realized PnL. |
| **09** | **Retirar Margen** | Input amount <= unlocked collateral and withdraw | **PASS** | Calls `MarginBank.withdraw(amount)`, returns USDso to wallet. |
| **10** | **Cancel Orden Límite**| View resting order in Active Orders and click Cancel | **FAIL** | **Missing Feature:** `PositionsTable.tsx` renders static text `"No resting limit orders on Somnia Tokyo book"`. No query for resting orders, no Cancel button, no `cancelOrder` execution flow. |
| **11** | **Cierre Parcial** | Close 25% or 50% of an open position from table | **FAIL** | **Missing Feature:** `PositionsTable.tsx` hardcodes 100% of `pos.size` in `handleClosePosition`. No partial close slider, percentage presets, or quantity input. |
| **12** | **Medidor de Salud** | View Health Factor gauge and status in Sentinel HUD | **PARTIAL** | Shows gauge and status, but calculates maintenance margin using a hardcoded 5% approximation (`notional * 0.05`) instead of reading pool's canonical `maintenanceMarginBps`. |
| **13** | **Panic De-Risk** | Click De-Risk 50% or Panic Exit 100% | **PARTIAL** | Sends IOC exit on-chain, but does not parse receipt `OrderFilled` events to report actual filled quantity vs remaining size, and lacks retry on partial fill. |
| **14** | **Tarjeta para X** | Open Card modal from position, download and tweet | **PARTIAL** | Historical baseline used legacy-branded download and hashtag strings instead of unified `LucidKeeper`. Fallback for missing hash shows pool address. |

---

## 2. Core On-Chain Lifecycle Requirements

| ID | Requirement | Status | Evidence / Link |
| :--- | :--- | :--- | :--- |
| **REQ-ONCHAIN-01** | Connect to Somnia Tokyo (`50383`) | **PASS** | Verified via `scripts/connectivity.mjs` and SDK |
| **REQ-ONCHAIN-02** | Exact collateral Approve (USDso) | **PASS** | Tx [`0x5034...9a17`](https://explorer.testnet.somnia.network/tokyo/tx/0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17), block 34042277 |
| **REQ-ONCHAIN-03** | Margin Deposit to MarginBank | **PASS** | Tx [`0xce32...399a`](https://explorer.testnet.somnia.network/tokyo/tx/0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a), block 34042291 |
| **REQ-ONCHAIN-04** | Allowance auto-reset to 0 | **PASS** | Allowance checked at 0 in block 34042291 post-deposit |
| **REQ-ONCHAIN-05** | Real Open Position (Buy IOC) | **PASS** | Tx [`0x8e5f...a47a`](https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a), block 34044423 (0.00013 BTC @ 79,946.0 USDso) |
| **REQ-ONCHAIN-06** | Real-time Position Monitoring | **PASS** | Verified via on-chain read `getPosition` & live HUD |
| **REQ-ONCHAIN-07** | Real Close Position (Sell IOC) | **PASS** | Verified on-chain via tx [`0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6`](https://explorer.testnet.somnia.network/tokyo/tx/0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6) |
| **REQ-ONCHAIN-08** | Margin Settlement & PnL Realization | **PASS** | Verified in MarginBank post-close |
| **REQ-ONCHAIN-09** | Margin Withdrawal | **PASS** | Verified via ABI and `MarginBank.withdraw` |

---

## 3. Historical Product Modules & Frontend UI Requirements — 28 October

| ID | Module / Feature | Status | Acceptance Criteria & Evidence |
| :--- | :--- | :--- | :--- |
| **REQ-UI-01** | **Native Wallet Integration** | **PASS** | RainbowKit 2 / Wagmi 2 modal configured for Tokyo 50383; strict chain ID validation and network switch. |
| **REQ-UI-02** | **Market Selector (21 Pairs)** | **PASS** | Dynamic discovery from SDK with base/quote decimals, tick, lot, and minQuantity (`MarketHeader.tsx`). |
| **REQ-UI-03** | **TradingView Lightweight Charts** | **IN PROGRESS** | Candlestick + Volume series consuming real indexer OHLCV data. Needs single price base and `series.update()` for open candle. |
| **REQ-UI-04** | **Trading Box (Order Execution)** | **PASS** | Dynamic fees & leverage read from contract; IOC & Limit support. Netting projection banner. |
| **REQ-UI-05** | **Portfolio & Positions Table** | **IN PROGRESS** | Displays multi-market positions, live PnL, 1-click Close button. Needs partial close support. |
| **REQ-UI-06** | **Active Orders & Trade History** | **IN PROGRESS** | Resting limit orders tab with Cancel button needed. Trade History needs indexer (`Fill` / `MarginEvent`) replacement over `localStorage`. |
| **REQ-UI-07** | **Margin Hub Modal** | **IN PROGRESS** | Deposit & Withdraw modal. Needs fix for sequential approve receipt awaiting. |
| **REQ-UI-08** | **LucidKeeper Risk Guardian** | **IN PROGRESS** | Health Factor gauge, labeled What-If stress simulation. Needs tab-active guard rebranding and exact fill reporting on panic de-risk. |
| **REQ-UI-09** | **Viral X Card Generator** | **IN PROGRESS** | Canvas export. Needs unified LucidKeeper branding and exact tx hash binding. |

---

## 4. Historical Engineering Quality Gates — 28 October

| ID | Gate | Tool | Target | Status & Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-ENG-01** | Strict TypeScript | `tsc --noEmit` | 0 errors, 0 `any` | **PASS**: `npx tsc --noEmit` exits with code 0. |
| **REQ-ENG-02** | Unit Tests & Coverage | `node --test` | 100% pass | **PASS**: 53/53 passing (1.3s). |
| **REQ-ENG-03** | Zero Secrets in Repo | `scripts/scan-secrets.mjs` | 0 secrets in tree or git history | **PASS**: 0 secrets detected. |
| **REQ-ENG-04** | Style & Linting | ESLint & Prettier | 0 errors, 0 warnings | **PASS**: 0 errors, 0 warnings. |
| **REQ-ENG-05** | End-to-End Testing | Playwright | All UI critical flows covered | **PASS**: 6/6 tests passing. |
| **REQ-ENG-06** | Production Build | Vite | Clean bundle, optimized assets | **PASS**: `npm run build` succeeds in 10s. |
| **REQ-ENG-07** | Lighthouse Audit | Google Lighthouse | Production build quality | **PASS**: Best Practices: **96**, Accessibility: **95**, SEO: **91**, Performance: **70**. |
| **REQ-ENG-08** | Vercel Deployment Readiness | `vercel.json` | SPA rewrites, clean routing | **PASS**: `vercel.json` configured. |
| **REQ-ENG-09** | Upstream Dependency Audit | `npm audit` | Documented transitive dependencies | **PASS**: Overrides for `ws` & `decode-uri-component`. |

---

## 5. Historical Bounty Deliverables Checklist — 28 October

| ID | Deliverable | Status | Location / Details |
| :--- | :--- | :--- | :--- |
| **REQ-BOUNTY-01** | Open Source GitHub Repository | **DONE** | [`https://github.com/Handilusa/LucidKeeper.git`](https://github.com/Handilusa/LucidKeeper.git) |
| **REQ-BOUNTY-02** | Verified On-Chain Transactions | **DONE** | Curated in `evidence/public/execution-2026-10-27.json` |
| **REQ-BOUNTY-03** | Track 1 SDK Feedback Reports | **DONE (3 reports)** | `feedback/` directory |
| **REQ-BOUNTY-04** | 2-3 Public Posts on X | In Preparation | LucidKeeper templates ready for final deployment |
| **REQ-BOUNTY-05** | 2-3 Minute Video Demo | Scheduled | Scheduled for 1 November after final features |
| **REQ-BOUNTY-06** | Public Deployed Application URL | **LIVE** | `https://lucid-keeper.vercel.app/` |

---

## 6. Frontend resume and documentation acceptance — 29 October 2026

Earlier PASS/DONE entries describe prior work, not verification of the inherited uncommitted redesign. This step is documentation-only.

| ID | Requirement | Current evidence / status |
| --- | --- | --- |
| **REQ-DOC-01** | Preserve the frontend brief and existing implementation | Read the complete `../prompt_frontend.txt`; preserve it outside the repo. Compare source/test/config/prompt hashes against the local baseline before committing. |
| **REQ-DOC-02** | Record implemented design, not a proposal | `docs/DESIGN.md`: source-backed palette, fonts/numeric formatting, layout, component paths, breakpoints, radii, focus, motion and explicit exceptions. |
| **REQ-DOC-03** | Maintain an actionable checkpoint | `docs/CHECKPOINT.md`: timestamp, DONE/IN PROGRESS/NEXT, numbered plan, exact commands, blockers and inherited-file scope. Refresh after meaningful changes and roughly every ten minutes. |
| **REQ-DOC-04** | Resume consistently | Read brief/CHECKPOINT/DESIGN/latest STATE, give a five-line status and execute NEXT. Update DESIGN for actual design changes; append history to STATE/DECISIONS/REQUIREMENTS. |
| **REQ-DOC-05** | Validate the design inventory | CLI lint executed: 0 errors, 3 documented orphan-token warnings, no modeled-pair contrast warnings. Token export and final document integrity checks must pass before the docs-only commit. This is not a full accessibility audit. |
| **REQ-DOC-06** | Commit only the validated increment | Explicit documentation paths only; no inherited application/test/config changes, local memory/audit artifacts, prompt copy, secrets, push or on-chain actions. Read back the actual commit and remaining worktree. |
| **REQ-DOC-07** | Revalidate the inherited frontend separately | **PENDING**: typecheck → unit/lint/build/E2E, responsive/keyboard/console checks and live read-only browser QA. Do not mark this complete using historical results or fixture values as live data. |

Supporting records: [DESIGN](DESIGN.md), [CHECKPOINT](CHECKPOINT.md), [current state](STATE.md), [DEC-013](DECISIONS.md). Detailed preservation and documentation validation reports remain local under `.git/lucidkeeper-audit/`; final check results belong in CHECKPOINT.

### Resumption evidence — 29 October 2026, 14:19 CET

- **REQ-DOC-01 / REQ-DOC-05:** documentation validator passed; 51 source/test/config/prompt hashes preserved, three histories append-only, 15 exported colors consistent, source paths/breakpoints/local links checked. Existing lint report reviewed; no new browser or contrast audit claimed.
- **REQ-DOC-06:** explicit staging and commit readback are the remaining documentation acceptance steps.
- **REQ-DOC-07:** remains pending; start with `npm run typecheck` after the documentation commit.

### Commit acceptance — 29 October 2026, 14:22 CET

- **REQ-DOC-06 PASS:** `7266e4b` has exactly the seven reviewed documentation paths; `--staged` validation passed, commit/worktree were read back, and post-commit preservation validation passed. Remaining dirty/untracked paths belong to inherited work; no push performed.
- **REQ-DOC-03 / REQ-DOC-04:** completion checkpoint now resumes at `npm run typecheck`, with no application function currently in progress. **REQ-DOC-07 remains pending.**

## Screenshot corrections requested — 29 October 2026

All below are pending implementation/verification unless dated evidence says otherwise.

1. Input-driven estimated liquidation before an open position, using typed side/size/leverage and verified protocol maintenance/fees; disclose cross-margin assumptions and unsupported inputs.
2. Retain last successful balances through read failures with Stale and observation time; isolate accounts/networks and never authorize execution from stale funds.
3. Robust `autoscaleInfoProvider` viewport without altering OHLC, visible outlier disclosure and a full-range control. Count candles honestly unless exact execution counts are available.
4. Explicit Last and Mark price labels; entry/liquidation position lines when their values are supportable, cursor tooltip and timestamped Live/Stale feed state.
5. Verify funding normalization/window against protocol sources and live read-only contract results; verify zero fees rather than defaulting unloaded values to zero.
6. Make leverage directly visible and the Guardian an always-visible custom SVG shield/semicircular gauge, including No exposure and unavailable/stale states.
7. Use exact verified Somnia brand-kit violet for brand/network/connect/focus/active tabs/Guardian; green/red for direction and PnL, amber for warnings. Respect logo rules.
8. Bundle licensed token SVGs locally with an initial fallback; BTC logo in selector/header/tables; USDso quote labels.
9. Three dark surface levels, 1px borders and subtle inner highlights.
10. NumberFlow mark updates with 300ms directional flash and SVG 24h arrows. Animate changed estimates, transaction states and risk; no invented progress or fill success.
11. Empty-position SVG plus add collateral → open position → arm Guardian guidance. One-time bounded loading entrances/shimmer, reduced-motion alternatives; no perpetual decorative animation.
12. Validate production build and compare deployed production with localhost; record actual deployment differences without pushing or signing.

Baseline check: `npm run typecheck` PASS on inherited source, 29 October 2026. Remaining gates are pending.

## Canonical LucidKeeper branding — 30 October 2026

- **Requirement:** Every public/project-name reference uses exact `LucidKeeper` branding. This includes application metadata, Reown app name, server output, fallback UI, card/download text, README, documentation and proposed X copy.
- **Implemented locally:** Former-name strings removed from all active-project text; fallback initials changed to `LK`; lowercase npm/localStorage identifiers retained as technical namespaces; established local directory unchanged.
- **Acceptance evidence:** tracked-text branding regression PASS in the **66/66** unit suite; active-project and built-output searches find zero former-name or incorrect-casing matches; typecheck, ESLint, build and isolated rendered title/header/footer Chromium check PASS. Deployment verification remains separate.

## Current reconciliation — 30 October 2026

This section includes the six ordered local fixes and supersedes historical status tables above. [STATUS](../STATUS.md), [CHECKPOINT](CHECKPOINT.md) and [validation](LUCIDKEEPER_REDESIGN_VALIDATION.md) are current frontend authority. Local success is not deployment or live execution permission.

| Requirement / module | Current status and evidence | Still unverified |
| --- | --- | --- |
| Wallet / REQ-UI-01 | RainbowKit/Wagmi implemented; Reown configuration 5/5 production checks passed on 29 October, [005](../feedback/005-production-reown-origin-allowlist.md) | Actual connection/relay/signing since the Reown change |
| Markets / REQ-UI-02 | 21 verified markets; local switching/native-interval tests and dated deployed read checks in validation | No new all-market production audit |
| Chart / REQ-UI-03 | Native interval/units validation, preserved OHLC, separate Mark line, reversible robust scale, keyboard/time/read states; [004 resolved](../feedback/004-mixed-candle-intervals.md), `src/features/terminal/Chart.tsx` | Full manual accessibility/performance; no mark-price substitution into execution candles is required |
| Trading / REQ-UI-04 | Raw bigint/fresh IOC mark; shared HOLD/EOA/full unsigned review; limit UI exists but signing is disallowed | Fresh production transaction/fill smoke test; controlled cases skipped |
| Positions / REQ-UI-05 | Identity-only partial dialog, fresh pinned raw size/mark/grid and post-review check; sourced changed/flat/flipped regressions | Nonempty live portfolio/close; no protocol reduce-only guarantee |
| Orders/history / REQ-UI-06 | Real indexed `Order`/`Fill`/`MarginEvent`, pagination, RPC/cache fallback; empty/orders/history browser checks | Cancel signing outside allowlist; no fresh nonempty book/cancel proof; controlled pagination failures skipped |
| Collateral / REQ-UI-07 | Exact2USDso review, shared HOLD, approval receipt awaited before deposit; withdrawal UI held/disallowed | Sequencing/revert paths skipped; no new live post-approval allowance/deposit verification; offline CLI envelope integration unfinished |
| Guardian / REQ-UI-08 | Pinned-block portfolio health, protocol maintenance input, active-tab/wallet-approval disclosure, account/network isolation and reload-disarmed settings; `src/features/sentinel/RiskGuardian.tsx` | Live execution, verified actual fill/remaining quantity and automated retry are not certified; receipt confirmation explicitly says actual fill not yet verified |
| Share / REQ-UI-09 | LucidKeeper canvas/PNG, related tx/pool labeling, explicit snapshot-not-realized-PnL disclaimer; `src/features/share/TradeCardModal.tsx` | Fresh live nonempty-position card path; hash syntax alone is not independent execution verification |
| Accessible groups | [006 production verified](../feedback/006-generic-container-accessible-labels.md): six named AX groups at desktop/phone, zero scoped naming violations/incomplete results | Real screen reader, manual contrast/modal-focus review, dense labels/small targets |
| Operational permission | **Wallet-scoped HOLD release:** subsequent explicit written owner confirmation; mandatory EOA/50383 context, exact funding/reviewed IOC gates remain | Complete offline CLI envelope integration and separate approval for each live step; agent handoff offline/user-mediated and publication user-owned; confirmation/provenance owner-reported, not independently verified |

Latest30October committed full verification at`0dce074`: **59passed/21skipped/0failed**,14files80cases; TypeScript/ESLint/build **PASS**(50.70s). Three additive HOLD/first-gate regressions retain scoped-release tests; downstream races remain skipped. Prior local real-serviceChromium14/16/0,five sizes is not newly rerun. [Sources and gaps](TEST_DATA_SOURCES.md). Earlier double-based totals and Lighthouse70 remain historical. DESIGN0errors/9warnings not rerun; dependencies27runtime/0dev-only/threeadvisories persist. [Triage](DEPENDENCY_TRIAGE.md). Buildwarnings remain.

**Submission status:** publicmain/Vercel`0dce074`/cloudCI verified15:43UTC;180/180local`dist/`filesmatchproduction,desktop/phoneread-onlysmokepass. No newliveexecution/fullproductionPlaywright certification. [Eleven issue reports](../feedback/README.md) exist; three originals unsubmitted, localfixes004–011 not upstreamacceptance. X copy draftonly. Further publication,user signing,video,2–3XURLs,feedback,whitelist/bounty submission are user-owned by1November23:59UTC. Optional OG/Twittermetadata not completed here.
