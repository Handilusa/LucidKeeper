# Pre-push functionality audit — 31 October 2026

**Historical11:36UTC audit preserved intact below.** The current release assessment is [PRE_PUSH_AUDIT](PRE_PUSH_AUDIT.md); later local implementation/tests supersede the restricted-product and skipped-browser findings here. No old audit authorizes new transactions.

**Verdict: passing available checks for a restricted testnet MVP, not acceptance of every requirement or a mass-scale trading release.** Source publication is owner-managed. Pushing this branch does not certify unrestricted trading, security, capacity or current production parity.

Scope: local uncommitted work on `feat/landing-and-profile`, HEAD `0129177efbd0cec50ce02811d8a196ba24620ee8`. Public Tokyo **50383**, SDK **0.32.1**. No wallet connection, arming, financial-response replacement, transaction preparation/signing/send or push in this audit. RTK was unavailable; native tools were used.

## Fresh results

| Check | Result / boundary |
| --- | --- |
| `npm test`, 11:27 UTC | **72 passed / 21 skipped / 0 failed**, 93 registrations; includes actual public-service reads, not only unit tests |
| `npm run typecheck` / `npm run lint` | **PASS**, 11:27 UTC |
| Supplemental TypeScript over app + E2E sources | **PASS**, 11:27 UTC; normal app tsconfig does not include E2E files |
| `npm run test:e2e`, 11:30 UTC | **22 passed / 17 skipped / 0 failed / 0 flaky**, Chromium, one worker, no retries |
| Production build in E2E | **PASS**, 10.88s; inherited annotation/large-chunk warnings remain |
| `npm run test:coverage`, 11:32 UTC | **14 passed / 2 skipped / 0 failed**; five loaded library files: 78.16% lines / 78.08% branches / 75% functions. This two-test-file command is not app-wide coverage or additional independent acceptance cases |
| Four routes × 375/768/1280/1920px, 11:31 UTC | **16 states PASS**; zero automated axe WCAG A/AA violations, overflow, console/page errors or attempted writes |
| Lifecycle motion, four widths | **PASS**: step order, keyboard pause/resume, runtime reduced motion, offscreen suspension; zero axe violations/overflow/errors/writes |
| Landing motion, four widths | **PASS**: pause and runtime reduced motion; zero overflow/errors/writes |
| App interaction/motion, four widths | **PASS**: keyboard tabs, collateral-dialog animation/focus trap/Escape/focus return, runtime reduced motion. **Position PNG/toast omitted**, no connected wallet |
| Disconnected profile | **PASS**: skip link, empty account/export state, connection modal and zero account-service requests. **Connected alias/tables/windows/exports/recovery not rerun** |
| Read-only HTTP/indexer, 11:22 UTC | **PASS**: no default account, invalid address400, no-store, explicit identities isolated; bounty15 fills/21 margin events, foreign read identity0. Both order lists empty; not nonempty-order parsing proof |
| `npm audit --json` / `--omit=dev --json` | **NOT CLEAN**, both exit1. All: **38 affected entries (17 high / 19 moderate / 2 low / 0 critical)**. Runtime: **27 (17 high / 8 moderate / 2 low)**; **11 moderate dev-only**. Four distinct advisory URLs, three runtime; [triage](DEPENDENCY_TRIAGE.md) |

The first fresh browser run had **21 passed / 17 skipped / 1 failed**: its old title regex rejected the correct `Trade | LucidKeeper` route title. Updated only the assertion; passing full rerun preserved separately. Standalone profile/tab audits now respect disconnected state rather than restoring bounty fallback data. Historical connected exports do not establish current coverage.

Evidence is local under `.git/lucidkeeper-audit/pre-push-2026-10-31/` (command logs, exit/timestamp JSON, original failed trace, passing `browser-fixed/`, dependency summary) and `.git/lucidkeeper-audit/landing-profile/pre-push*-2026-10-31/` (route/motion/profile reports and screenshots). Initial failures and earlier reports remain intact. New dependency runs use timestamped directories rather than overwriting 30 October evidence.

Final local verifier **11:36 UTC PASS**:11 documents/83 local links and headings,13 successful command records, expected failing dependency-audit exits, browser totals/retained failure, explicit export omissions, ignored memory/audits and unchanged HEAD. Native `git diff --check` passes (existing CRLF warnings). Seven script syntax checks pass; initial shell-quoting syntax-run error is retained, corrected in the runner without production changes. Fresh desktop1280/mobile375 terminal and mobile375 disconnected-profile screenshots were inspected; no bounty-account data is displayed.

## Requirements not accepted

1. **General multi-user execution:** viewing/storage isolation is implemented and tested at pure/cache/disconnected boundaries. Deposit, trading, close and Guardian execution remain restricted to the sole bounty EOA. Arbitrary connected wallets are read-only; **cancel, withdrawal and limit signing are prohibited**. This is intentional runtime policy, not implemented unrestricted trading. Do not remove bounty safeguards to obtain green tests.
2. **Critical connected flows:** actual wallet switching/disconnect/network changes during review, fresh allowance/approval/deposit sequencing, rejection/revert/uncertain-send paths, nonempty orders, close/partial/no-fill outcomes, current account exports and armed Guardian transitions remain untested or skipped. Confirmation is not a fill; Guardian/close records still disclose unverified actual filled/remaining quantity. There is no protocol reduce-only guarantee or automatic retry certification.
3. **Capacity:** no load/concurrency/soak target or test has been performed. Each active browser polls public RPC/indexer services (including 3/5/15-second reads); portfolio history is bounded to 1,000 newest rows per source. Provider quotas, multi-tab amplification, backoff under load, latency/error budgets and saturation behavior are not measured. Somnia's advertised capacity does not establish application capacity.
4. **Financial completeness:** window ROI, starting/historical equity, complete cash flows, full-cycle win rate and comparable leaderboard remain unavailable. Current source-backed values and bounded price-PnL/volume charts are not substitutes. [Portfolio contract](PORTFOLIO_DATA.md).
5. **Security/accessibility/deployment:** dependency findings and third-party input reachability remain open. No fresh publication secret-scan certification, human screen-reader/real-device validation, independent security review or new deployment-parity audit. Latest independently checked deployment remains `0dce074`, 30 October 15:43 UTC. CI currently runs `npm ci` and `npm test` only—not lint/typecheck/build/E2E/security/load gates.
6. **Operational/submission work:** general offline CLI handoff integration is incomplete/fail-closed; the requested 720-second close expiry remains unimplemented (current300s). Published X URLs, demo video, new build publication and bounty submission remain owner tasks. Historical receipts are not current-UI execution evidence or transaction authorization.

## Push recommendation

Publishing as a **restricted Somnia Tokyo testnet MVP with these limitations disclosed** is consistent with the passing local checks. **Do not describe it as fully tested, security-cleared or mass-scale ready.** Before a general trading release, resolve the execution-policy/product-scope decision separately, complete controlled connected lifecycle/fill tests, remediate and retest dependencies, define capacity targets and run authorized load tests, then verify the deployed build. No such policy change or live operation is authorized by this audit.

[Requirements reconciliation](REQUIREMENTS.md#current-reconciliation--31-october-2026) · [Coverage provenance](TEST_DATA_SOURCES.md) · [Project status](../STATUS.md)
