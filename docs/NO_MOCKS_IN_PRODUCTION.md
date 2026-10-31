# Production data / mock-isolation audit

## Remediation — 31 October 2026

**The three requested failure groups now PASS locally.** This supersedes F1–F5 below for the tested remediation on `feat/landing-and-profile`, based on `4e0dc74`; the original FAIL-first audit and its evidence are preserved as historical findings. This document accompanies the local-only remediation commit; obtain its exact identity with `git rev-parse HEAD`. No push or deployment is claimed.

| Requested group | Fix / verification | Result |
| --- | --- | --- |
| Missing values become zero/epoch; unknown units assume 8 decimals (F1/F2) | `src/lib/data/observations.ts` validates required fields before conversion. Indexed fills/orders require catalogue-resolved pools; prices and quantities use that pool's quote/base decimals. RPC margin logs require decoded amount, account, hash and block identity. Missing/malformed data rejects rather than producing display rows; explicit returned zero/epoch remains distinct from absence. | **PASS** |
| Missing history arrays appear successfully empty (F3) | Both `Fill` and `MarginEvent` must be arrays on every page. Missing arrays raise an unavailable state; actual returned empty arrays remain valid. RPC failure cannot certify empty indexed history. Versioned indexed caches store raw responses and revalidate them; old transformed caches are retained but not read. Nonempty fallback records remain explicitly limited/cached. | **PASS** |
| Hypothetical previews and diagrams lack literal “illustrative” (F4/F5) | Visible literal labels now qualify Guardian stress, netting/liquidation previews, chart liquidation references, portfolio explanation and landing lifecycle/workflow/consensus diagrams. Existing scenario exclusions and actual-position prerequisites are unchanged. | **PASS** |

Checks completed:

- `npm test`: **109 passed / 19 historical skipped / 0 failed** (128 cases), including ten reader/cache regressions in `test/history-observations.test.mjs`. Tests bundle actual production readers in memory; controlled data never enters production sources.
- App typecheck, E2E typecheck and lint: **PASS**. `npm run build`: **PASS**, 10.95s; existing dependency annotations and large-chunk warnings remain.
- `npx playwright test test/e2e/history-integrity.spec.ts`: **9/9 PASS**. Verifies unavailable versus empty/zero, pagination, incomplete orders and visible labels at 375/1440px. Screenshots inspected; full-page sticky-header capture overlap is not a new label-layout defect.
- Fresh byte/source checks: **197 dist files**, **18 excluded harness/fixture markers**, **9 required label strings present**, no source test imports or shipped test/map paths. Local artifact: `.git/lucidkeeper-audit/no-mocks-remediation-bundle-2026-10-31.json`.
- Full `npx playwright test` rerun: **97 passed / 0 skipped / 0 failed**, 2.5 minutes, against the same production build. Accepted output: `.git/lucidkeeper-audit/no-mocks-remediation-final-2026-10-31/`. Initial full attempt retained under `.git/lucidkeeper-audit/no-mocks-remediation-chromium-2026-10-31/`: two new tests used a nonexistent spinbutton selector and the shell timed out. Tests were corrected to use the existing quantity field and actual mobile/disclosure controls; no production workaround was added.

**Remaining WARNs:** vendor `createTestClient`, `Mock Connector` and Reown `mocked-quote-id` are still emitted; the fresh static import evidence below does not verify runtime activation. DOGE close evidence is still missing; the recorded BTC close is not a DOGE close. No new all-market on-chain attestation, deployed-parity check, signing, broadcasting, push or deployment. Existing contract addresses, execution arithmetic, IOC/limit encodings, expiry and historical receipts are unchanged.

### Current W1 evidence — 31 October 2026, 17:56:21 UTC

**WARN: third-party utility code ships transitively; no direct project utility import was found.** Normal package imports are present: `src/app/Providers.tsx:2,5` imports `wagmi` and `@rainbow-me/rainbowkit`; `src/chain/wagmiConfig.ts:1,3` uses RainbowKit `getDefaultConfig` and wagmi `http`; `src/lib/data/observations.ts:1` imports viem `formatUnits`. We do **not** assert that these packages are never imported.

| Third-party package / inspected utility | Current emitted chunk / marker | Project-import evidence |
| --- | --- | --- |
| `viem@2.57.11`: `node_modules/viem/_cjs/clients/createTestClient.js:3–16`, `node_modules/viem/_cjs/actions/test/setBalance.js:5–14` | `dist/assets/index-C9eePQGN.js`: `createTestClient`, `evm_setAccountBalance` | No direct utility import or test-client selection in the project scan. Graph: Providers → RainbowKit → wagmi connectors → Safe provider/SDK → viem CommonJS barrel → test client/actions. |
| `@wagmi/core@2.22.1`: `node_modules/@wagmi/core/dist/esm/connectors/mock.js:5–15` | `dist/assets/en_US-SK3WV2N3-CHcojZ0S.js`: `Mock Connector` | No direct `@wagmi/core` or mock-connector import in the project scan. Graph: `src/app/App.tsx` → wagmi barrel → `@wagmi/core` barrel → mock connector. Production configuration does not explicitly select `mock`. |
| `@reown/appkit-controllers@1.7.8`: `node_modules/@reown/appkit-controllers/dist/esm/src/controllers/BlockchainApiController.js:416–445` | `dist/assets/core-iVj5EKJB.js`: `mocked-quote-id` | No direct controller/package import in the project scan. Graph: Providers → RainbowKit → wagmi WalletConnect connector/provider → Reown AppKit → controllers barrel → BlockchainApiController. |

Fresh TypeScript-AST import/export/dynamic-import/require inventory: **70 JS/TS/MJS production/config files, 285 import statements**, zero direct utility imports and zero project test imports. Full-line searches also found zero `createTestClient`, `testActions`, `Mock Connector`, `mocked-quote-id`, `BlockchainApiController`, `@wagmi/core`, `@reown/appkit-controllers`, viem test-utility paths or wagmi mock paths in those files; separate searches of `public/` code/HTML and root `index.html` found none. Normal `viem`, `wagmi` and RainbowKit imports are recorded, not suppressed.

Fresh Vite module graph uses **`write:false`, `envFile:false`**: **8,132 loaded / 2,594 included / 2,599 emitted modules**, **67 emitted first-party source modules**, zero loaded project test modules and zero direct first-party importers of the four physical vendor utility modules. Their transitive source traces and chunk rendered lengths are recorded. Existing emitted files contain the markers above. Source/import evidence and graph edges substantiate direct-import absence; keyword absence alone would not.

Local evidence: `.git/lucidkeeper-audit/no-mocks-vendor-closure-2026-10-31T17-56-21-527Z.json` contains package versions, complete normal-package import inventory, graph traces/chunk mappings and hashed vendor excerpts. Run `node .git/lucidkeeper-audit/no-mocks-vendor-closure-2026-10-31.mjs` in this local audit workspace to create a **new timestamped** report; historical JSON remains untouched. This metadata is intentionally not published or shipped, so a fresh clone does not include the audit script/report.

**Current Reown correction / verification limit:** lines 436–445 catch an onramp quote error and return the caller's `amount` for fees/payment/purchase fields plus `quoteId: 'mocked-quote-id'`. The inspected implementation has **no `exchangeRate: "1"` field**; that wording in preserved historical W1 is not supported by this fresh read. Whether any of these vendor paths is activated by a real LucidKeeper user was **not verified**. Emission is not activation, nor proof of fabricated perps observations.

### Requested skipped-scenario replay — 31 October 2026, 18:02:42 UTC

Only the **19 historical skipped scenario equivalents** were exercised in a new local-only assertion harness: **19 passed / 0 skipped / 0 failed, 168 assertions**. Thirteen cases bundle the actual broadcaster in memory with controlled recovery/RPC/send/evidence/policy boundaries; four use actual wire validation/boundary rejection with already-mined public transaction fields kept in memory; one checks actual SDK/Tokyo network plus the writer rebased to Git metadata; one checks a controlled placement-only log subset. No signing, live send or wallet operation occurs.

The original published skip registrations are empty historical markers, not executable assertions. They remain unchanged to preserve the exact 16-path commit scope; removing their skip flags would falsely turn empty callbacks into PASS. This replay therefore does **not** change the earlier full-suite total of **109 passed / 19 historical skipped**, and does not certify genuine resting-only receipt provenance or live send/race outcomes. The **97/97** accepted Chromium run is unchanged; passing tests were not rerun in this closure.

Accepted script/report: `.git/lucidkeeper-audit/skipped-scenarios-2026-10-31T18-02-34-077Z.mjs` and `skipped-scenarios-2026-10-31T18-02-40-297Z.json`. Initial replay `skipped-scenarios-2026-10-31T18-00-44-721Z.json` is preserved: **18 passed / 1 failed** because the local harness's evidence-string assertion omitted a BigInt serializer. The corrected harness is a new timestamped file; no production change or historical artifact overwrite was used to obtain PASS.

## Original FAIL-first audit — historical, before remediation

**31 October 2026 · Overall: FAIL under the requested strict criteria.** The project test harness is excluded, but malformed-response defaults can become displayed financial values, and hypothetical UI does not contain the required literal **“illustrative”** label. No seeded live balances, fabricated trader cohort, random financial generator or project-harness execution path was found. These are different conclusions, not a blanket mock-free certification.

Audited source: `170bc44f204203d164526add46b37e614f7dec84`, branch `main`, initially clean. Scope: `src/`, `public/`, root `index.html`, build configuration and freshly rebuilt `dist/`. This is a read-only production audit: **no production fixes, wallet connection, transaction preparation, signing, broadcasting, push or deployment**. Only this report and the README Testing note are publication changes.

## FAIL findings — first

### F1 · FAIL · Missing financial fields become zero; missing indexed times become epoch

- **Sources:** `src/lib/data/indexer.ts:209–210,214,242,244,352–355`; descriptions at `:227,254`.
- **User-facing sinks:** `src/features/portfolio/PositionsTable.tsx:91–95,386–396,449–464`. Nonempty transformed rows are accepted; prices/quantities/descriptions are displayed without a missing-field label. Indexed timestamp `0` is formatted as `1970-01-01 00:00:00 UTC`. The open-order timestamp is transformed but is **not displayed** by the current open-order table.
- **Reproduced:** the actual production reader, bundled in memory, accepted controlled successful GraphQL responses lacking selected fields. A fill became `OrderFilled: Long 0 BTC @ $0.00`; a deposit became `Margin Deposit: 0.00 USDso`; both had timestamp `0`. An open order became price/full quantity/remaining quantity `0`. Public-shaped synthetic hashes kept these cases independent of a missing-hash rendering error; none are real receipts.
- **Related source-only finding:** `src/lib/data/tradeHistory.ts:84,98` also substitutes `0` if a returned deposit/withdrawal log lacks its decoded amount. Its amount is displayed at `:92,106`; malformed-log execution was not separately reproduced.
- **Expected:** reject incomplete observations or retain unknown/null fields with an unavailable label; do not convert absence into a financial zero or canonical time.
- **Scope:** conditional on malformed/incomplete upstream data. This does **not** prove the real indexer or RPC returned these cases during the audit.

### F2 · FAIL · Unknown market units are guessed

- **Sources:** `src/lib/data/indexer.ts:203–211,348–362`; both readers default an unresolved market to **8 base decimals** and symbol `PERP`.
- **Sinks:** indexed history descriptions and open-order remaining/full quantities in `src/features/portfolio/PositionsTable.tsx:394–396,452–456`.
- **Reproduced:** a controlled row without resolvable pool metadata and quantity atoms `1000000000000000000` became **10,000,000,000 PERP**, rather than unknown units, in both fill and open-order transforms. The real market catalogue contains multiple decimal scales, not just 8 (`src/lib/data/markets.ts:8,20,32,68,152,248`).
- **Expected:** resolve verified metadata or reject/label unknown units. The profile snapshot already rejects unknown active pools (`src/features/profile/profileData.ts:33–34`); this does not repair the terminal readers.
- **Scope:** reproduced reader behavior, not evidence that a real unknown pool was shown live.

### F3 · FAIL · Missing history arrays can be presented as an empty query window

- **Sources:** `src/lib/data/indexer.ts:200,233` treats absent `Fill` / `MarginEvent` arrays as `[]`. The HTTP boundary at `src/lib/data/readResilience.ts:76–77` rejects absent `data`, but not missing arrays inside a present `data` object.
- **Reproduced:** `{ data: {} }` returned `[]` without an error from the actual history reader. Genuine returned empty arrays are a valid empty result; absent selected arrays are not the same observation.
- **Sink/condition:** `src/features/portfolio/PositionsTable.tsx:95–107,436–440`. Page zero attempts RPC/cache fallback; subsequent pages can immediately report an empty window. If no fallback rows exist, the missing-array case does not set the failure flag and can show “No history in this query window.”
- **Expected:** validate both required history arrays and distinguish unavailable from successfully empty history.

### F4 · FAIL · Hypothetical numerical previews lack literal “illustrative”

| Location | Existing qualification | Verdict under the requested literal rule |
| --- | --- | --- |
| `src/features/sentinel/RiskGuardian.tsx:228–255,631–674` | “Hypothetical Stress Simulator”, “What-If Simulation Only”, “Scenario equity”, “Simulated PnL”; real position prerequisite, user-adjustable ±30% stress range | **FAIL:** no “illustrative” label adjacent to these scenario outputs |
| `src/features/trade/TradingBox.tsx:487–498,521–535` | “If fully filled” resulting-size/netting preview; “Est. liquidation”, standalone leverage scenario and exclusions | **FAIL:** no “illustrative” label for hypothetical resulting size/liquidation |
| `src/features/terminal/Chart.tsx:195–197,265`; `src/features/portfolio/PositionsTable.tsx:346–347` | Portfolio liquidation estimate; other market marks held constant | **FAIL:** estimate/scenario wording, not literal “illustrative” |

These are deterministic, qualified calculations based on current reads and/or user inputs, **not fabricated live PnL or verified liquidation prices**. The failure is the user's stricter label requirement. Adding labels or changing calculations is outside this audit's authorization.

### F5 · FAIL · Conceptual landing illustrations use different wording

`src/features/landing/WorkflowGraphic.tsx:51` says **“WORKFLOW ILLUSTRATION”**; `src/features/landing/Landing.tsx:271` names an **“Illustrated six-step trading lifecycle”**; `:451` says **“Conceptual diagram, not network telemetry.”** None says literal **“illustrative”**. These are nonfinancial workflow/architecture illustrations, not observed validator counts or live telemetry. **FAIL is lexical compliance only**, not an allegation of false network measurements. The rebuilt JS contains the existing wording and zero literal `illustrative` hits.

## WARN findings and evidence limits

### W1 · WARN · Vendor mock/test utilities are emitted

| Vendor source | Rebuilt bundle evidence | Verdict |
| --- | --- | --- |
| `node_modules/viem/_cjs/clients/createTestClient.js:3–16`; `node_modules/viem/_cjs/actions/test/setBalance.js:5–14` | `dist/assets/index-BKZEYTvb.js:49`: `createTestClient`, `testClient`, `evm_setAccountBalance`, `evm_mine`, `impersonateAccount` | **WARN:** vendor test-client/actions ship; no first-party test-client selection found |
| `node_modules/@wagmi/core/dist/esm/connectors/mock.js:5–15` | `dist/assets/en_US-SK3WV2N3-Bjof3sB-.js:46`: `id:"mock"`, `name:"Mock Connector"` | **WARN:** vendor mock connector ships; production configuration does not select it |
| `node_modules/@reown/appkit-controllers/dist/esm/src/controllers/BlockchainApiController.js:416–445` | `dist/assets/core-qRytg1Gt.js:4`: `quoteId:"mocked-quote-id"` | **WARN:** onramp error fallback returns a mocked quote with `exchangeRate:"1"` and equal payment/purchase amounts; no visible execution path from LucidKeeper was established |

Vite module graph traces:

- `src/app/Providers.tsx:5` → RainbowKit → wagmi connectors → Safe connector/provider/SDK → viem CommonJS barrel → test-client/actions.
- `src/app/App.tsx:2` → wagmi barrel → `@wagmi/core` barrel → mock connector.
- `src/app/Providers.tsx:5` → RainbowKit → WalletConnect connector/provider → Reown controllers → `BlockchainApiController`.

**8,131 loaded / 2,593 included / 2,598 emitted modules**, including **66 first-party source modules**. The test-path filter finds **60 emitted viem action modules: 30 physical CommonJS files plus 30 virtual wrappers**. They are not 60 project tests. Emission proves code is available in shipped chunks, **not that a user executed it**. “No test or mock utilities ship anywhere” would be false; “the project's isolated wallet/RPC harness is not shipped” is supported.

### W2 · WARN · Address roles are documented; fresh all-market verification was not rerun

The 25 unique first-party address literals are inventoried below. They have identifiable protocol/account/sentinel roles; neither test wallet appears. Existing integration documentation describes indexed/on-chain verification, but this task did **not** independently reread every pool/factory, current code or unit parameter. Do not promote a `VERIFIED` constant name or prior QA to a fresh network attestation. See [integration configuration](../README.md#verified-integration-configuration), [landing sources](LANDING_SOURCES.md) and `docs/REQUIREMENTS.md:167`.

### W3 · WARN · Requested DOGE order-to-close evidence is incomplete

`src/content/project.ts:30–33` and `src/features/landing/Landing.tsx:555` explicitly separate the historical BTC close from DOGE and state that no verified DOGE close hash is available. **PASS for honest UI disclosure; WARN for the missing lifecycle evidence.** No close was prepared or sent to fill this gap. The README Testing note preserves the distinction.

## PASS findings — production provenance and exclusions

| Finding | Evidence | Verdict |
| --- | --- | --- |
| Project harness imports are absent from production | `test/e2e/mock-wallet.ts:6–8` defines isolated fixtures; source import scan found zero `test/`, test/spec, Playwright or harness imports; Vite graph loaded zero project test modules | **PASS** |
| Exact fixture wallets and project markers are absent from all emitted files | All **197** `dist/` files searched as bytes; zero hits for both full addresses and the 12 additional markers listed below | **PASS** |
| No project test files or source maps shipped | Rebuilt file inventory: no `test/`, `.test.`, `.spec.`, `mock-wallet`, Playwright or `.map` paths | **PASS**, vendor-code exception W1 |
| No financial random/timer generator found | `src/lib/data/readResilience.ts:3,29,33,56,66,74` uses randomness for retry jitter and timers for bounded reads; `src/components/LoadingState.tsx:7` is slow-read UI; `src/features/profile/profileData.ts:80` revokes download URLs | **PASS** for reviewed uses, not a blanket statement about vendor internals |
| Real RPC simulation is not a mock fill | `src/features/trade/TradingBox.tsx:324–326` calls the configured public client's `simulateContract`; transaction/receipt states remain separate | **PASS**, simulation is preflight, not execution evidence |
| Hardcoded arrays have identifiable non-fabricated roles | `src/content/project.ts:15–35` is sourced historical receipts; `src/lib/data/markets.ts:3–256` is static market metadata, not prices/PnL/candle data; interval/window/preset arrays are controls | **PASS** for roles; freshness limit W2 and scenario labels F4 |
| Profile never fabricates missing ROI, win rate or equity history | `src/features/profile/Profile.tsx:200–201,626–636,656–662`; guarded return inputs remain null/incomplete | **PASS** |
| Profile charts do not seed synthetic observations | `src/features/profile/Profile.tsx:215–230`; `src/features/profile/ProfileChart.tsx:14–19,21–29` | **PASS**: cumulative returned realizing updates / returned daily notional; empty input draws no synthetic points |
| Leaderboard has no seeded traders | `src/lib/data/observedAccounts.ts:1–16`; `src/features/profile/ObservedLeaderboard.tsx:10–25` | **PASS**: up to five actually connected browser-local accounts, bounded indexed 7D volume, not global profit/ROI |
| Funding distinguishes unknown from zero | `src/app/App.tsx:274–280`; `src/lib/data/fundingState.ts:1–18`; `src/features/terminal/FundingGuide.tsx:13–16` | **PASS**: absent/error/stale inputs are unknown; known zero alone is not a fabricated balance |
| Cached requests are not displayed as verified fills | `src/features/trade/TradingBox.tsx:154–175`; `src/features/sentinel/RiskGuardian.tsx:201–209`; `src/features/portfolio/PositionsTable.tsx:130–138,454–464` | **PASS** for current history presentation: generic “Cached … record”, limited-history and observed-time labels; cache is not authoritative |
| RPC fallback time is observation time, not invented chain time | `src/lib/data/tradeHistory.ts:91,105`; `src/features/portfolio/PositionsTable.tsx:459–464` | **PASS** for disclosure: “RPC log · observed”; amounts require decoded logs, with conditional default defect F1 |
| Historical screenshot is labeled, not live account state | `src/features/landing/Landing.tsx:165,180`; `public/assets/product/capture.json:2–8`; [capture provenance](LANDING_SOURCES.md#product-and-receipt-provenance) | **PASS**: dated actual prior capture; metadata states public reads/no financial replacements. Provenance records reviewed, not a fresh recapture |
| Proof values/animations are sourced | `src/content/project.ts:15–35`; `src/features/landing/Landing.tsx:535–543`; `src/features/landing/LandingMotion.tsx:16–27` | **PASS**: final/accessibility values are historical receipts; decorative digit reels are presentation, not market data |
| SDK keyword hits do not establish fabricated perps data | `node_modules/@somnia-chain/markets-sdk/src/config.ts:59`, `node_modules/@somnia-chain/markets-sdk/src/indexerRead.ts:71`; `dist/assets/Profile-CYZ7TToS.js:9170,3423` | **PASS for classification only**: optional `fakeOracle` contract wiring and diagnostic “client-boundary stub function”; neither demonstrates fake UI values |

### Keyword review inventory

Case-insensitive scan: `mock`, `fake`, `dummy`, `sample`, `placeholder`, `stub`, `fixture`, `lorem`, demo mode, simulation, `Math.random`, `setTimeout`. **75 source files / 21 public files; 32 matching source lines, zero public/config matching lines.** Numerical defaults, financial arrays, animations and addresses were also manually traced; keyword absence alone is not evidence of correctness.

- **PASS — input hints:** `Profile.tsx:52,508`, `TradingBox.tsx:421`, `RiskGuardian.tsx:735,768`. Placeholders are empty-input prompts/derived SL/TP suggestions, not confirmed orders or account values.
- **PASS — transport/status:** `TradingBox.tsx:66,324–328,340–341,346,578,581–583`; `readResilience.ts:3,29,33,56`; `LoadingState.tsx:7`; `profileData.ts:80`.
- **FAIL only for strict labeling — scenario group:** `RiskGuardian.tsx:228,246,252,255,627,631,633,655,670` (F4).
- **WARN — vendor bundle matches:** `mock` in 2 files, `fake` in 2, `sample` in 3, `placeholder` in 13, `stub` in 3, `simulate` in 5, `Math.random` in 8, `setTimeout` in 12. No `dummy`, `fixture`, `lorem` or literal `demo mode` matches. Counts are **files containing terms**, not defects. Vendor contexts include transport sampling, UI/icon placeholders, framework stub diagnostics and embedded-image text; the substantive mock/financial fallback hits are W1. This is not an exhaustive dynamic vendor audit.

Exact byte searches, each **PASS / zero hits**:

```text
0x1111111111111111111111111111111111111111
0x2222222222222222222222222222222222222222
mock-wallet                 __mockSend
__wallet                    mockWallet
connectMock                 walletEvent
Test wallet refuses         Controlled profile source failure
Controlled overload         Unmodelled call
11111111-1111-4111-8111-111111111111
test/e2e/
```

Harness symbol references in the reviewed project roots occurred only in eight `test/e2e/` files. Build entry/configuration is `index.html` → `src/main.tsx`; `vite.config.ts:7–14` configures React/Tailwind and the source alias, not test injection. `tsconfig.json:24` includes source/Vite config, not tests; `package.json:17–24` separates test commands from `vite build`; `vercel.json:2–4` publishes `dist` only.

## Displayed-number provenance

Verdicts concern provenance, not financial accuracy/security certification. **Historical** means recorded evidence; **derived** means calculated from real source inputs; **illustrative** means a hypothetical example/scenario, which must be labeled literally under this task's rule.

| Surface / numbers | Source and derivation | Verdict / qualification |
| --- | --- | --- |
| Landing network 50383; 01–06 lifecycle steps | `src/chain/somniaTokyo.ts:4`; `Landing.tsx:271–277` | **PASS**: network constant / ordinal controls, not user/validator counts; conceptual label F5 |
| Landing screenshot prices, funding, OI, health, sizing | `public/assets/product/capture.json:2–8`; `Landing.tsx:165–180` | **PASS historical**: captured 30 Oct 22:30:20.564 UTC, not refreshed live data; embedded estimates are historical UI, not new verified execution |
| Proof: 2 USDso; 120 DOGE; 0.07525 USDso | `src/content/project.ts:18–27`; [recorded sources](LANDING_SOURCES.md) | **PASS historical**: deposit receipt + DOGE fill; not present balances or PnL |
| Somnia performance/finality descriptions | `Landing.tsx:438–451,510–513`; [official claim sources](LANDING_SOURCES.md) | **PASS attribution**: not measured LucidKeeper latency, live validators or invented fee dollars |
| Terminal STT, wallet USDso, deposited/available collateral | `src/app/App.tsx:40–79,257–265`; `src/features/terminal/AccountSummary.tsx:35–64` | **PASS real/derived**: pinned Tokyo reads and read-status display; internal zero sentinels are not used as successful unavailable balances |
| Terminal mark/index, normalized 8h funding, OI, 24h change | `src/app/App.tsx:81–164`; `src/lib/math/preview.ts:19–23`; `src/lib/data/indexer.ts:114–137`; `MarketHeader.tsx:66–132` | **PASS real/derived**: RPC fields, rate-window normalization, OI base scaling × mark, indexed completed closes; unavailable values are hidden/labeled |
| Execution OHLC/base volume | `src/lib/data/indexer.ts:62–111`; `src/lib/data/candles.ts:37–75`; `Chart.tsx:316–349` | **PASS indexed**: native-interval executions, validation, empty/error/stale disclosure; no random walk, patched prices or gap-filling candles |
| Position size/entry, price uPnL | `src/app/App.tsx:179–248`; `PositionsTable.tsx:288–310`; `profileData.ts:29–63` | **PASS real/derived**: state/position/mark reads; signed size × (mark − entry); not net return after fees/funding |
| Current account health | `src/app/App.tsx:181–187`; `src/features/sentinel/GuardianOverview.tsx:10–15` | **PASS real/derived**: equity/maintenance ratio from actual account inputs; decorative gauge scale is not fabricated equity |
| Portfolio liquidation line | `src/app/App.tsx:224–228`; `Chart.tsx:265` | **FAIL strict illustrative label**: single-block deterministic scenario, other marks held constant (F4), not protocol-guaranteed liquidation |
| Entry leverage/budget, 2/5/10 USDso and 25/50/100% presets, 2% reserve, fee/margin estimates | `TradingBox.tsx:38–46,69–75,96–123,432–483,507–547` | **PASS control/derived roles**: user drafts/defaults and on-chain parameter calculations, not funded balance or fill; hypothetical netting/liquidation label F4 |
| Guardian stress PnL/equity, ±30%; SL/TP suggestions and exit percentages | `RiskGuardian.tsx:228–255,480–497,631–674,735,768` | **FAIL strict illustrative label** for stress; **PASS control role** for user-trigger suggestions/exit fractions; requires an actual position |
| Terminal indexed fills/margin history/open orders | `indexer.ts:199–255,340–371`; `PositionsTable.tsx:386–464` | **FAIL conditional**: F1/F2/F3; otherwise sourced indexed observations |
| RPC fallback amounts/time; cached requests | `tradeHistory.ts:67–107`; `PositionsTable.tsx:100–107,444–464` | **PASS disclosure**, conditional amount default F1: log amounts / local observation time, bounded/limited cache, no verified-fill claim |
| Profile equity, balances, margins, current positions | `profileData.ts:29–63`; `Profile.tsx:162–164,234–238,523–568` | **PASS real/derived**: SDK account snapshot and same-block reads; errors/stale snapshots hidden |
| Profile realized price PnL, volume, funding, net fees | `Profile.tsx:168–197` | **PASS indexed/derived**: scoped returned rows; signed realized atoms, fill quote atoms, signed funding and charges minus rebates; successful empty sets can sum to real zero |
| Profile time series, fills/order changes/funding/transfers | `Profile.tsx:215–299`; `ProfileChart.tsx:14–29` | **PASS indexed/derived**: returned records, UTC windows; no synthetic equity curve or fabricated daily observations |
| Profile ROI, win rate, equity history | `Profile.tsx:200–201,626–636,656–662` | **PASS unavailable**: missing canonical historical inputs are not substituted |
| Profile CSV/PNG and position-share image | `profileData.ts:83–103`; `Profile.tsx:382–418`; `src/features/share/TradeCardModal.tsx:18–21,48–91` | **PASS provenance/disclosure**: current loaded observations/rows, account/time/block/testnet context; not independent execution proof or private on-chain activity |
| Leaderboard ranks / 7D volume | `ObservedLeaderboard.tsx:12–25` | **PASS bounded indexed**: sum returned quote notional for real connected-address registry; 1,000-row cap, no seeded cohort, not profit ranking |
| Funding screen zero-vs-unknown and field-guide parameters | `FundingGuide.tsx:13–16`; `fundingState.ts:9–16`; `src/app/TerminalRoutes.tsx:71–105` | **PASS**: read-state predicates and documented gas/collateral/expiry/encoding facts, not invented faucet balances |
| Retained compatibility HTML | `public/index.html:20–45,49–82` | **PASS source review**: initial unavailable dashes and read-only `/api/status` response fields, no default signer or financial seed; Vite emits root HTML, not this compatibility file |

## First-party hardcoded-address inventory

**PASS for documented roles; WARN for fresh contract/unit attestation (W2).** Addresses are normalized here only for comparison. Transaction hashes and Reown's public project ID are not EOA/contract addresses. SDK/vendor address catalogues are dependencies, not included in the 25 first-party literal count.

| Role | Full address | First-party source |
| --- | --- | --- |
| MarginBank | `0x478769e1177c0773c43a593dccc4ad15f15f1394` | `src/chain/abis.ts:270`; repeated in market/retained offline configuration |
| USDso | `0xed7993a74dae1e6656b704a424dcd8711aaf4f72` | `src/chain/abis.ts:271`; `src/lib/offline-transactions.mjs:11` |
| Bounty historical/read-only account | `0x1420cf8bb9d92c3fdb674ecc5a57295c59078fda` | `src/content/project.ts:9`; retained policy/client constants, not a default browser signer |
| Zero-address sentinel | `0x0000000000000000000000000000000000000000` | `src/lib/browser-intent.ts:14`; unsupported-argument guard |
| BTC pool | `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` | `src/lib/data/markets.ts:10`; `src/chain/abis.ts:272` |
| ETH pool | `0xd6cb1dd58580b84d76068ac21594219ce03aeddf` | `src/lib/data/markets.ts:22` |
| SOL pool | `0xb483ec1fb34996638677c20ab087b16f1896fa53` | `src/lib/data/markets.ts:34` |
| BNB pool | `0x3d2a99fe1e2bdeaa25024515a2d2202daf9531ad` | `src/lib/data/markets.ts:46` |
| DOGE pool | `0xc410012e39765cd5f772e84bacb19554aec040df` | `src/lib/data/markets.ts:58` |
| XRP pool | `0x7058579f3248559963f79adb937c6de9f953e060` | `src/lib/data/markets.ts:70` |
| AVAX pool | `0xde9762b6b441133d1314c68864ae4e63a6ee45c7` | `src/lib/data/markets.ts:82` |
| LINK pool | `0xf71b619450bafe953f47b9b556416a3a67b443b5` | `src/lib/data/markets.ts:94` |
| SUI pool | `0x1be21287cfb865a7c462ff3c4f275e70bcccefe4` | `src/lib/data/markets.ts:106` |
| ADA pool | `0x34fa62909f77699a7a6278d992f72ff31c7a619d` | `src/lib/data/markets.ts:118` |
| HYPE pool | `0x63b47ed4a7de0fde659b0d82441dd74828b7297a` | `src/lib/data/markets.ts:130` |
| TAO pool | `0xd9b6a347a3ae9fd6ba21179d3343f2c8a922f697` | `src/lib/data/markets.ts:142` |
| NEAR pool | `0x1cd15ae8bff0fe0a7f49233be8b90734775ba454` | `src/lib/data/markets.ts:154` |
| ZRO pool | `0x2a1822b02039ddf0e293f3f7243673fc03eaf16c` | `src/lib/data/markets.ts:166` |
| LIT pool | `0xdcb0ad226727b2ce92857f0af5751389d42b2a3f` | `src/lib/data/markets.ts:178` |
| VVV pool | `0x352636ab146039851ef06d6367a106d5fb4e6409` | `src/lib/data/markets.ts:190` |
| 1000PEPE pool | `0xfa9b9e50cc1745113d57893991af200a74c86b6f` | `src/lib/data/markets.ts:202` |
| PUMP pool | `0x76c981a52530cdf9497559140aafcd8cd16836e7` | `src/lib/data/markets.ts:214` |
| ZEC pool | `0x2a73129f26917124bd2a47a9b355c395c537f050` | `src/lib/data/markets.ts:226` |
| WLD pool | `0x0f464d57c1fd839e4d87a408bbccdab8f77e6394` | `src/lib/data/markets.ts:238` |
| XLM pool | `0x74b05b9b8c8f180b53b7891018f3b254b3e658c9` | `src/lib/data/markets.ts:250` |

## Checks, artifacts and limitations

Environment: Windows; Node **24.19.0**, Vite **6.4.5**, SDK **0.32.1**, viem **2.57.11**, wagmi **2.19.5**, RainbowKit **2.2.11**. Target configuration is Somnia Tokyo **50383**, RPC `https://api.hideki2.infra.testnet.somnia.network`, indexer `https://hideki-dev.smk.somnia.host/v1/graphql`. No signing account or external transport was used by the isolated checks.

| Command/check | Observed result |
| --- | --- |
| `npm run build` | **PASS**, 11.30s; existing dependency annotation and >500 kB chunk warnings remain |
| `node .git/lucidkeeper-audit/no-mocks-scan-2026-10-31.mjs` | **PASS execution**, 15:48:36 UTC; inventories/import/byte searches above; not overall acceptance |
| `node .git/lucidkeeper-audit/no-mocks-build-graph-2026-10-31.mjs` | **PASS execution**, 15:48:47 UTC; second Vite build uses `write:false`, `envFile:false`; confirms project exclusion and vendor inclusion |
| `node .git/lucidkeeper-audit/no-mocks-fallback-check-2026-10-31.mjs` | **PASS reproduction**, 15:50:14 UTC; six in-memory controlled responses / 13 assertions; **confirms defects**, not acceptance; zero external HTTP/RPC requests |
| Additional literal/bundle context inspection | **PASS execution**: production transformed descriptions/scenarios present; zero JS `illustrative` hits |
| Git scope and documentation verifier | **PASS working-tree check**, 15:55:43 UTC: 34 local-link destinations / 99 source references; 219 other baseline paths protected; final change/commit scope restricted to README and this report; no push |

Local-only build log, scripts and full JSON inventories live under `.git/lucidkeeper-audit/no-mocks-*-2026-10-31.*`; they are intentionally not publication artifacts or shipped application modules. The three script commands therefore require this local audit workspace, not merely a repository clone. The fallback script bundles the actual production reader with esbuild entirely in memory, substitutes controlled `Response` objects and never mounts a browser or signs/sends anything. It does not inject cases into `src/`, `public/` or `dist/`.

Build inventory: **197 files**, including **173 JS**, **3 CSS**, **1 JSON**, **3 WebP**, **1 JPEG**, **2 Markdown**, **12 SVG**, **1 HTML**, **1 text**. Searches covered all emitted bytes for distinctive harness markers, including image/metadata files; generic keyword context review covered textual artifacts. Minification can erase identifiers, so exclusion is supported by source imports **and** the module graph, not string searches alone.

Not performed: new live-chain receipt/pool verification, deployed-byte parity, connected-wallet trading, dynamic activation of every vendor wallet/onramp path, full unit/E2E reruns, historical equity reconstruction, secret/security certification or fixes. Historical receipt/capture provenance is linked, not newly executed or independently recaptured. RTK was unavailable; native tools were used without installation. Production state and historical evidence remain unchanged; this dated report records the audit outcome.
