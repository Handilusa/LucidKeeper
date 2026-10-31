# Read-only publication / deploy verification

> **Later local docs/UI update — 31 October 2026:** the current funding copy now follows the owner's program-distributed-funds guidance and explicitly excludes Arena funds. The funding-copy failure in this report describes the previous `755e6f3` baseline, not the updated UI. [Current guidance and preserved source findings](FUNDING_VERIFICATION.md) · [Unfunded-judge video checklist](../SUBMISSION_TODO.md). No new independent team confirmation, close, claim, deployment or live-wallet certification is implied. All historical findings below remain preserved.

**31 October 2026**, baseline **`755e6f303f56193757bbd56f54c7f24135f1b289`**, branch **`feat/landing-and-profile`**. New documentation/smoke script only; application, dependencies, financial helpers, existing evidence and ignore rules remain unchanged. No push, deploy, GitHub authentication, signing, transaction preparation, broadcast, claim or fund movement.

## FAIL / UNVERIFIED gates first

1. **FAIL — preventative ignore coverage:** no tracked/historical wallet JSON was found, but `wallet.json` is not ignored. Existing secret/history scan passes within its stated heuristic scope; absence of a preventive pattern is not a discovered credential leak.
2. **FAIL — bounty funding guidance:** official general pages associate paper USDso with Arena, while the screen/README suggest paper credit without a Builder-only exclusion. **UNVERIFIED:** independent judge's eligible Tokyo STT/USDso funding, whitelist/email and limits. Do not substitute Arena funds. [Sourced findings](FUNDING_VERIFICATION.md).
3. **FAIL — WalletConnect troubleshooting:** the product has no specific Reown-origin/fallback explanation. **UNVERIFIED:** deployed Reown allowlist and actual phone/extension fallback behavior.
4. **UNVERIFIED — current release publication/deployed parity, human Tokyo prompt, actual wallet approvals/fills/Guardian/settlement**, X URLs/video/submission. The anonymous public repository page is accessible, but that does not publish this local branch.
5. **UNVERIFIED — 720-second close support:** live DOGE snapshot is verified, but the supported window remains 300 seconds and there is no protocol reduce-only flag. Nothing prepared. [Plan](DOGE_CLOSE_PLAN.md).
6. Dependency risk remains **38 affected entries: 17 high / 19 moderate / 2 low / 0 critical**; the clean install did not clear it. Owner review is required; do not describe the release as mainnet/security-cleared or mass-scale ready.

## CHECK 1 — all reachable Git history, before other checks

Commands executed from the app/Git root:

```powershell
Get-Command rtk,gitleaks,trufflehog -ErrorAction SilentlyContinue
git status --short --branch
node .git/lucidkeeper-audit/history-secrets-scan.mjs
git ls-files -ci --exclude-standard
```

The local masked scanner invokes `git for-each-ref`, `git rev-list --all`, **`git log --all -p --no-ext-diff --no-textconv`**, `git ls-tree -r -z` for each commit, `git cat-file blob` for every unique blob, `git ls-files`, `git ls-tree -r --name-only 755e6f3` and `git check-ignore --no-index -v --stdin` with synthetic pathnames. It does not read local credential files.

**PASS — scan:** **100 commits / four refs / 670 unique blobs** (666 text, four binary printable/UTF16 checks), **67,649 patch lines**, **952 64-hex candidates** classified as public transaction/block/event/content/ABI values, **zero secret/raw-signed-wire/raw-signature/valid English BIP39 phrase findings**. No forbidden historical/current paths, no ignored-but-tracked files, and none in `755e6f3`. Observed **13:32:04.807 UTC**. Refs: local `main`, `feat/landing-and-profile`, `chore/frontend-self-improve`, cached `origin/main`; no tags present. Remote-only/deleted/unreachable history is not covered by the locally reachable `--all` graph.

`rtk`, gitleaks and trufflehog were **unavailable**; native Git plus masked regex/context checks were used, without installation. Initial generic `KEY` alerts were header names/cache namespaces; the English-phrase probe initially joined object/member names across code punctuation, then was corrected to require actual phrase/word-array separators. Initial reports are retained, masked; they are not confirmed leaks. The final scan includes recognized credential/token/JWT/PEM patterns, literal secret assignments (including unquoted hex), English BIP39 checksums, contextual raw signatures and parseable signed transaction wires. It is **not** entropy/obfuscation/all-language or independent security certification.

**PASS — tracked-file exclusion:** `.env*` except `.env.example`, PEM/key/keystore paths and local `docs/CODEX_MEMORY.md` are covered. `.git/lucidkeeper-audit/` is Git metadata and inherently outside the tracked tree. `git ls-files -ci --exclude-standard` returns nothing; all **211 baseline tracked paths** are reviewed project material, not local memory/audit/credentials. `755e6f3` introduced none of those ignored paths.

**FAIL — missing preventive pattern:** synthetic `wallet.json` receives no ignore match; no such file is tracked or in reachable history. Do not generate one to test it. The owner should separately authorize adding a wallet-JSON prevention rule. No ignore-rule edit or history rewrite was made. If a real credential is later discovered, stop publication, **rotate/revoke first**, assess exposure, then have the owner choose coordinated `git filter-repo`/BFG history cleanup or a reviewed clean publication repository; never treat deletion at HEAD as remediation, never force-push/rewrite automatically.

Evidence: `.git/lucidkeeper-audit/history-secrets-2026-10-31T13-32-04-807Z.json`; post-document commit rescan should bind the new HEAD too.

## CHECK 2 — root / Vercel / clean install

Executed: `git rev-parse --show-toplevel`, root directory listing, `node --version`; inspected `package.json`, `vite.config.ts`, `index.html`, `vercel.json` and searched for `.nvmrc`/`.node-version`.

**PASS:** root **`C:/Users/Handi/Desktop/LucidKeeper/dream-sentinel`**. `package.json`, lock, Vite config, React `index.html` and `vercel.json` are **directly at root**. Vite's default output is `dist`; Vercel also sets `outputDirectory: dist`. `public/index.html` is retained compatibility material, not the React build entry. **Vercel Root Directory must be blank**, not `dream-sentinel`. `engines.node >=22` admits Node24; no `.nvmrc`/`.node-version` pins it. Actual verification runtime **v24.19.0**.

Clean clone/install/build command family, with all scratch writes inside project Git metadata:

```powershell
git -c core.hooksPath=NUL -c credential.helper= clone --no-hardlinks --single-branch --branch feat/landing-and-profile . $clone
npm --prefix $clone ci --userconfig=$emptyUserConfig --globalconfig=$emptyGlobalConfig --cache=$localAuditCache
npm --prefix $clone run build --userconfig=$emptyUserConfig --globalconfig=$emptyGlobalConfig
```

**PASS**, finished **13:31:20 UTC**: fresh clone of **`755e6f3`**, empty isolated npm user/global configs (no credential reads), **728 installed / 729 audited**, ci/build exit **0**, build **57.48 seconds**, **`dist/index.html` exists**, **197 regular dist files**. Existing SDK annotation/large-chunk warnings remain. Logs/result prefix `.git/lucidkeeper-audit/clean-clone-2026-10-31T13-27-59-*`; the clone/build is retained there, not under an external temp directory.

**PASS — configuration:** `vercel.json` catch-all `/ (.*)` pattern (stored as `/(.*)`) rewrites to `/index.html`; static assets remain filesystem-served under Vercel's normal handling. `/assets/(.*)` has **one-year immutable cache**; other paths **no-cache**. Routes are handled in `src/main.tsx`/`src/app/TerminalRoutes.tsx`, including `/app/profile/:address`, invalid addresses and intentional not-found views. **UNVERIFIED — effective production settings and actual Vercel headers/rewrites** until the owner verifies the intended deployment. See [SMOKE_TEST](SMOKE_TEST.md).

## CHECK 3 — visibility / judge README / missing delivery values

Executed `git remote -v` via a wrapper masking any URL credentials and `git branch --show-current`:

```text
origin https://github.com/Handilusa/LucidKeeper.git (fetch)
origin https://github.com/Handilusa/LucidKeeper.git (push)
feat/landing-and-profile
```

Anonymous HTTP GET **`https://github.com/Handilusa/LucidKeeper`** returned **200**, matching repository title and **Public badge**. **PASS — remote exists and was publicly readable without authentication** on 31 October. No fetch/push/login or GitHub token use. Owner must independently open the URL and intended commit/branch in **incognito**; verify judges can see source/README/feedback and remote CI after publication.

README review: pitch and network/token limits are clear at the top; the judge route tour and own-wallet lifecycle are present; known limits explain missing ROI, browser-local Guardian, no reduce-only protection, audit risks and undeployed changes. **PASS for basic onboarding**, **FAIL/UNVERIFIED for submission completeness and bounty-safe funding**.

Values/actions still required:

- **Demo:** the README already links the established `https://lucid-keeper.vercel.app`; it is **not a literal demo placeholder**. The adjacent banner correctly says the new branch is local, but “Public demo” can still lead a judge to the older build. Verify the intended deployment; update the URL/status or clearly label the release preview pending. Do not claim `755e6f3` is live from that link alone.
- **Video:** no actual demo-video URL recorded; add the real 2–3 minute video.
- **X:** explicitly labelled drafts, no actual post URLs; replace with **2–3 published URLs** mentioning both **@DreamDEXSomnia** and **@Somnia_Network**.
- **Whitelist/email:** no public email replacement literal exists. Verify the owner's actual DoraHacks/bounty enrollment email and new-wallet entitlement with the official team privately; do not publish personal email/ticket data or invent a procedure.
- **Reown:** configure the project used in the build and exact effective deployment origin, normally **`https://lucid-keeper.vercel.app`**. No path/trailing slash. Add a custom/redirect/preview origin if used. No secret project credential belongs in `VITE_*`.
- Complete feedback delivery, actual independent-wallet QA and bounty/DoraHacks submission before **1 November 2026, 23:59 UTC** (owner-provided deadline).

## CHECK 4 — funding, documentation only

Executed repo doc/source searches for funding/STT/USDso/faucet/whitelist; unauthenticated HTTP reads of official dreamDEX docs index/developer guide, raw perps overview/margin/link-bot pages, and SDK perps/get-testnet-funds references. No faucet/app claim was attempted.

**FAIL — bounty-safe guidance; UNVERIFIED — new judge entitlement.** Exact sources, restrictions, contradictory Arena linkage, Shannon-only faucet/mint exclusion and current screen/README source mapping are in [FUNDING_VERIFICATION](FUNDING_VERIFICATION.md). There is no sourced Tokyo USDC/tUSDC collateral substitute. Stop and obtain official bounty support if eligible STT/USDso is missing.

## CHECK 5 — wallet connectors / Reown

Inspected `src/chain/wagmiConfig.ts`, `AppHeader.tsx`, `NetworkNotice.tsx`, `walletError.ts`, the installed RainbowKit `getDefaultConfig`/connector and English locale implementations, and [Reown relay docs](https://docs.reown.com/cloud/relay).

**PASS — source inventory:** default RainbowKit **Popular** list: **Safe** (context-dependent/hidden outside supported Safe context), **Rainbow**, **Base**, **MetaMask**, **WalletConnect**; installed **EIP-6963/injected extensions** are discovered by wagmi/RainbowKit. Do not confuse displaying a wallet option with verifying its real connection, or with permission to use an Arena smart wallet. Project ID: optional public `VITE_WALLETCONNECT_PROJECT_ID`, otherwise public fallback **`006c638cc6ec95a3982952a1ee86aa05`**; this is not a signing key.

Reown documents denied requests from origins outside a **nonempty restricted allowlist**, empty allowlist permits all origins, localhost is permitted, changes take **15 minutes**. An invalid/nonmatching project/origin can prevent relay/phone connection; the precise deployed error is **UNVERIFIED**, not necessarily a single universal 403 string. Injected/native connectors are independent of the relay and should remain selectable; actual denial/fallback requires human extension/phone QA.

**FAIL — clear fallback explanation:** application code contains no specific Reown/project/origin failure handler directing the user to retry with an installed injected wallet/contact the site owner. RainbowKit has generic status/retry UI; `walletError` is not a connector-origin diagnostic. Do not claim that the message explains allowlisting. Add **`https://lucid-keeper.vercel.app`** to the effective project's allowlist after confirming deployment; add the effective redirected/custom/preview origin if different. No dashboard authentication/settings change performed.

## CHECK 6 — open short / exact non-executable close plan

Executed **`node --experimental-strip-types .git/lucidkeeper-audit/read-doge-position.mjs`** after reviewing the public read-only SDK APIs. **PASS — current read:** **−120 DOGE**, block **38002855**, **13:32:29.898 UTC**, official verified pool/grid/decimals, zero USDso allowance, STT present. BTC pool is also active; shared-margin caveat retained. This does not prove a closing fill or current settlement.

[DOGE_CLOSE_PLAN](DOGE_CLOSE_PLAN.md) specifies exact fresh remaining size, opposite-side IOC buy **2** (not FOK1/limit0), existing floor-to-tick 2% ceiling helper, review fields, no auto-pull/funding, concurrency/residual guards and canonical hash/receipt/account-matched fill/position/settlement evidence destinations in **README + STATE.md**. **UNVERIFIED/BLOCKED:** protocol reduce-only protection does not exist in this direct call, and **720s support is absent**. Resolve owner acceptance of just-in-time **300s** versus a separately scoped 720s implementation **before explicit go/preparation**. No nonce/gas/fees/calldata/envelope prepared.

## CHECK 7 — deploy-day smoke deliverable

Created [SMOKE_TEST](SMOKE_TEST.md) and **`scripts/smoke-deployed.mjs`**, with source/alias/whole-dist binding, all route reloads, cache/MIME, console reporting, modal, public profile, pause cleanup/resume, 375px and explicit human Tokyo/WalletConnect QA. Uses existing Playwright tooling, no package/CI modifications. Reports exclusively created local ignored JSON, bounded deadlines/requests, no financial/wallet fixtures or sign/send calls.

Executed **`node --check scripts/smoke-deployed.mjs`** and **`node .git/lucidkeeper-audit/test-smoke-local.mjs`**. The latter serves the clean clone's dist on loopback with the declared SPA/cache behavior and invokes the new script. It is **local harness validation**, not Vercel verification; real SDK/RPC/indexer/browser reads are not mocked. Earlier probe failures remain preserved: wrong-capitalization modal selector corrected; guard-induced Pulse telemetry errors distinguished from financial writes; local static server corrected to support the SDK's normal **HEAD** metadata requests (earlier artificial HTTP400s); browser request cap set explicitly to500 to accommodate uncached direct visits/reloads without manufacturing asset failures. Normal SDK analytics to their exact endpoint are now allowed/counted, not treated as on-chain writes or silently suppressed.

**PASS — final automatic local checks**, run started **13:40:41.591 UTC**: eight HTTP/direct-browser route reloads, entry asset MIME/cache and HTML revalidation, **197/197 whole-dist decoded-byte matches**, arbitrary public profile read-only, wallet modal, pause cleanup/resume and all three375px views. **Zero console/uncaught errors**, **zero financial/unknown write attempts**, **206 static GETs /381 browser requests /9 normal SDK analytics POSTs**. Aborted navigation metadata reads remain visible in the diagnostic list; no console error was suppressed. Evidence: `.git/lucidkeeper-audit/smoke-deployed-2026-10-31T13-40-41-591Z.json`. **Overall UNVERIFIED (exit2)** because deployed Git/source binding and real-wallet Tokyo/fallback checks require the owner. Production was not targeted. No existing full E2E/unit suite was rerun as part of this new documentation/script task; prior release counts remain dated prior evidence.

## Owner action order

1. Resolve the wallet-JSON prevention gap and review residual dependency risks; rescan every intended publication ref after any changes. A real leak would require rotation first and owner-managed history remediation.
2. Obtain written official **Builder-only** new-wallet funding/whitelist/limits guidance; correct the screen/README ambiguity under separate authorization. No Arena substitution.
3. Resolve Reown-origin/injected-fallback explanation and effective public project/origin. Verify demo/video/X/whitelist/submission values; publish only factual evidence.
4. Publish the reviewed feature branch yourself, inspect remote CI, open/merge the intended PR and deploy the correct source using [DEPLOYMENT](DEPLOYMENT.md). The agent does not authenticate, push or deploy.
5. Verify public access in incognito, full deployment SHA/alias/build parity, actual headers/routes/console/mobile and human extension/phone/Tokyo prompt using [SMOKE_TEST](SMOKE_TEST.md). Complete independent-wallet [MANUAL_QA](MANUAL_QA.md) only with eligible funds.
6. If a DOGE close is wanted, explicitly resolve **300s vs 720s**, review [DOGE_CLOSE_PLAN](DOGE_CLOSE_PLAN.md), then give explicit preparation go. Signing/send are not authorized by this review. Record actual subsequent evidence; do not fabricate a close.
7. Publish the real X URLs/video, deliver feedback and submit before **1 November, 23:59 UTC**.
