# Project status

Updated **31 October 2026** · local three-close documentation on **`feat/landing-and-profile`**, based on **`81ac509`** · **this update is uncommitted; not pushed or deployed**. The owner reports the preceding version deployed; this documentation task does not independently verify deployed parity. Previously recorded independent production check: **`0dce074`**, 30 October 15:43 UTC. Historical chronology/evidence is retained in [STATUS_HISTORY](STATUS_HISTORY.md).

## Release outcome

| Task | Local outcome | Remaining gate |
| --- | --- | --- |
| 1/P0 independent wallets | `383b0ae`: arbitrary Tokyo wallets, exact funding/review, switch/disconnect cleanup, close/Guardian/cancel/withdraw | Real second-wallet funding/fills/settlement |
| 2/P0 lifecycle tests | `079f6e7`: two isolated injected accounts; former browser skips replaced; reverted-receipt display fixed | Human extension/actual liquidity QA |
| 3/P1 address metrics | `023fe1f` + preservation `bb8cd28`: public profiles, guarded ROI, local observed-volume ranking | Verified boundary equity/complete flows; ROI/win rate unavailable |
| 4/P1 dependencies | `fd59a44`: safe audit fix/review documented; no compatible dependency changes | **38 affected entries**, 27 runtime + 11 dev-only; owner risk acceptance |
| 5/P2 resilience | `4419570`: bounded reads, rate-limit cooldown, dedup/cache/batching, lazy trading chunk, capped static load | Not sustained multi-user/RPC/CDN capacity |
| 6/P0 shipping | Deployment/pre-push documents, reviewed inherited visual files and expanded CI; final local checks complete | Owner publication, deployed parity and submission |

Earlier six-task release checks (`755e6f3`): **79 passed / 0 skipped / 0 failed Chromium**, **94 passed / 19 skipped / 0 failed** unit/service (113 cases); typecheck/E2E types/lint/build pass. Prior publication: **211 tracked paths / 13 documents / 103 local links, zero issues** (not full-history/security certification). Prior local static check: **240/240**, 12 concurrent, p95 **42.65 ms**; not users/RPC capacity. [Exact results and boundaries](docs/PRE_PUSH_AUDIT.md).

## Funding and unfunded-judge tour — 31 October

- Local UI/docs now explain STT gas and bounty-program USDso distribution to whitelisted wallets. **Known limitation: independent-wallet trading requires program-distributed funds. Do not use Arena funds.** This is the owner's latest product guidance, not a new independently obtained team confirmation.
- Empty wallets get a prominent neutral read-only state with profile/history/docs and Guardian inspection. Failed reads stay distinct from zero; deposited/locked margin and existing positions are not erased by zero wallet USDso. Guardian stress requires a real fresh position; no exposure is invented.
- Hero/README link the explicit read-only Live test account (never a default signer) and real deposit/DOGE proof. Historical owner-relayed FOK opening attribution is preserved. Its separate **31 October IOC close is now verified**, alongside BTC/AVAX. No close prepared or executed by the agent.
- Funding-update checks: **88 passed / 0 skipped / 0 failed Chromium**, **99 passed / 19 historical skipped / 0 failed** unit/service (118 cases); app/E2E types, lint/build pass. Includes nine new isolated browser cases and five pure funding-state cases; 375/1440px affected screenshots visually reviewed. Local docs: six documents / 60 local destinations, protected evidence/helpers/dependencies unchanged. Existing dependency build warnings and 38 affected entries remain; no real-wallet, security or deployed acceptance is claimed.

## Critical boundaries

- **AVAX opening proof — 31 October 18:26:46 UTC:** owner-confirmed current product flow, **IOC=2**, fully filled **4.8 AVAX long at 8.588 USDso**, **41.2224 USDso notional (not margin)**, zero remaining quantity. Receipt, matching fill, account events and a later position snapshot independently verified read-only. [Proof](README.md#proof) preserves the distinct owner-relayed DOGE FOK and historical BTC provenance.
- **Three closes independently verified — 31 October 20:42:57 UTC:** **BTC short0.00093@77,654.2 (20:39:52UTC)**, **DOGE short120@0.07574 (20:40:11UTC)**, **AVAX long4.8@8.565 (20:40:30UTC)**; all IOC2, fully filled, zero order remainder/position after close and flat at later pinned block **38261043**. AVAX/DOGE close-hash gates completed. [Hashes, receipt/fill/account evidence and exact price-PnL limitations](docs/audit/013-owner-reported-three-closes.md). No submitting-UI, net-return, withdrawal or full-demo certification. Local proof/docs/tests remain uncommitted; unrelated visual/dependency work preserved. No agent wallet action, signing, send, commit, push or deployment.
- **Local proof checks — 31 October 18:53–18:56 UTC:** unit/service **111 passed / 19 historical skipped / 0 failed** (130 cases); relevant Chromium **33 passed / 0 skipped / 0 failed** (`funding-guidance` and `release-ui`, not a full-suite rerun). Docs verifier: **224 tracked paths / 15 documents / 120 local links, zero issues** before staging the new unit file. App/E2E types, lint and build pass; existing dependency annotation/chunk warnings remain. Mobile/desktop Proof captures reviewed. Tests used the worktree with preserved CSS edits; later unrelated branding edits are not covered by the tested build or included in this commit. Only proof/docs/tests are committed; unrelated CSS/branding changes remain unstaged, so the original worktree is **not clean**. No deployed parity or real-wallet acceptance is claimed.

- **Local data-audit remediation — 31 October, `feat/landing-and-profile` based on `4e0dc74`:** missing financial/time fields and unknown units are rejected; missing history arrays show unavailable, not empty success; scenarios/diagrams have literal illustrative labels. Accepted full suite: **109 passed / 19 historical skipped / 0 failed**, Chromium **97 passed / 0 skipped / 0 failed**; types/lint/build and dist harness-exclusion checks pass. Requested local-only replay of the 19 skipped scenario equivalents: **19 passed / 0 skipped / 0 failed**, 168 assertions; published historical markers remain unchanged. Fresh vendor package/import/graph evidence confirms no direct utility imports, but transitive emission remains WARN and runtime activation is unverified. [Audit and exact limits](docs/NO_MOCKS_IN_PRODUCTION.md). Local-only commit; no push/deploy/on-chain actions.

- Any connected wallet can review/sign supported actions through its own wallet on **Tokyo 50383**. Agent policy is separate: no keys, signing, broadcasting, fund movement, claims or push performed in this release work.
- IOC enum 2, limit 0 and **300-second expiry** preserved. A confirmation is not a fill; opposite-side closes are not protocol-guaranteed reduce-only. Historical 720s DOGE request remains outside current product work/unimplemented.
- Production finance uses real RPC/indexer data; controlled wallets/financial results are tests only. Guardian requires an active tab, fresh reads and wallet approval. Aliases/URLs do not verify ownership/privacy.
- [Security notes](docs/SECURITY_NOTES.md), [manual QA](docs/MANUAL_QA.md), [financial gaps](docs/DISCOVERIES.md) and [capacity limits](docs/SCALABILITY.md) remain explicit.

## Owner delivery

[Submission checklist](SUBMISSION_TODO.md) · [Exact shipping instructions](docs/DEPLOYMENT.md). Main verification path for unfunded judges: **record the full-flow demo video and show tx hashes**. Owner publishes the reviewed branch/build, verifies deployed parity and real-wallet QA, replaces X drafts with real URLs and submits feedback/bounty materials. **Deadline: 1 November 2026, 23:59 UTC** (user-provided). Historical on-chain hashes do not prove current-UI execution. Video, publication and independent-wallet QA remain pending; BTC/DOGE/AVAX closes are now independently verified. No agent live transaction or deployment is claimed.
