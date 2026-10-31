# Deploy-day smoke test

Use against the **actual deployed origin** after the owner publishes/deploys. This is functional, read-only QA, **not** a load test, security certification, fill test or funding permission. Production has not been declared equivalent to `755e6f3` by creating this file.

## 1. Bind the deployed version before testing

1. In **Vercel → Deployments → intended deployment**, record the complete Git SHA, branch, build time/log URL and deployment URL. Verify that the production alias points to that deployment, not an old preview. Check the GitHub commit is **`755e6f303f56193757bbd56f54c7f24135f1b289` or its intended descendant**; a higher date/short SHA alone is not proof.
2. Root Directory **blank**, Vite, Node **24.x**, `npm ci`, `npm run build`, output **`dist`**. The repository contents are already root; do not select a `dream-sentinel` subfolder. Preserve `vercel.json` rewrites/cache headers.
3. Confirm the intended optional public `VITE_WALLETCONNECT_PROJECT_ID` environment scope. Do not add signer or RPC override variables. Add the actual origin in Reown; see below.
4. Build the exact SHA in a **clean local checkout** and retain its `dist`. `755e6f3` has **no embedded commit marker/reliable commit response header**. Asset names, rendered layout, an explorer hash or the repository HEAD alone do not prove the live commit. Compare **all decoded dist bytes** and record the Vercel source binding as well. Build/env differences must be investigated, not waived.

## 2. Automated read-only checks

From the repository root, after `npm ci` (uses the already installed `@playwright/test`; install Chromium yourself if absent):

```powershell
node scripts/smoke-deployed.mjs --url=https://lucid-keeper.vercel.app --expected-commit=755e6f303f56193757bbd56f54c7f24135f1b289
```

For full parity, use `--dist=dist` only after building that exact clean source checkout. Alternatively supply a clean audit clone inside the project:

```powershell
node scripts/smoke-deployed.mjs --url=https://lucid-keeper.vercel.app --expected-commit=755e6f303f56193757bbd56f54c7f24135f1b289 --dist=.git/lucidkeeper-audit/clean-clone-2026-10-31T13-27-59/dist
```

That local clone path is specific to this verification machine; elsewhere create your own clean checkout/build and use its relative `dist` path. Replace the origin/full SHA with the **actual intended deployment**, not an arbitrary later SHA. No credentials, paths or query strings in `--url`; HTTPS required except loopback. The parity path must remain inside this project and contain no symlinks. The script checks the checkout SHA, clean tracked source and ancestry; the owner must still verify rebuild provenance and Vercel logs.

Checks:

- Direct HTTP visits and browser reloads: `/`, `/app`, `/app/docs`, `/app/profile`, `/app/profile/0x2222222222222222222222222222222222222222`, invalid address and app/root not-found states. All return the SPA HTML with HTTP 200; invalid routes display an intentional error view rather than a hosting 404.
- Entry JS/CSS are HTTP 200 with correct MIME and **`public, max-age=31536000, immutable`**; HTML revalidates (`no-cache`). Optional whole-dist comparison catches missing/stale mixed chunks.
- Fresh Chromium, no connected wallet: testnet badge, route-specific view, **arbitrary public address rendered read-only**, no financial write controls, wallet modal opens without choosing a connector.
- Landing workflow pause removes `data-motion` and observer visibility state and leaves **zero running animations**; resume restores motion state. System reduced motion is respected.
- **375px** landing, terminal and public profile load without document-wide overflow.
- Reports console/uncaught errors rather than hiding them. Financial/RPC/indexer data are real or visibly unavailable; **no financial fixtures, synthetic wallet, keys, sign or send methods** are used. The HTTP safety guard rejects unknown/non-read POSTs, except normal SDK analytics at the exact `https://pulse.walletconnect.org/e` endpoint, which are counted separately. Aborting those analytics manufactures console errors and would not verify normal deployed behavior. Inspect a blocked request before changing the allowlist.

Output is a timestamped, exclusively created **local ignored** `.git/lucidkeeper-audit/smoke-deployed-*.json`. Values from errors/responses are not dumped. **Exit 0 = all checks pass; 1 = failure; 2 = remaining UNVERIFIED checks.** Normally exit 2 remains until the manual checks below are evidenced. The script deliberately does not pretend to verify real-wallet or Vercel-dashboard state.

Limits: sequential static reads, at most **280 GETs / 256 dist files / 500 browser requests**, request/navigation deadlines and a six-minute overall deadline; no smoke-runner retries/load generator (the application's own normal read retry/cooldown behavior remains active). Normal SDK browser subscriptions remain read-only. Never use the existing wallet-fixture E2E suite as proof of deployed funding or actual extension approval.

## 3. Human browser smoke — no trade required

Use an incognito/fresh browser and a **human-controlled test wallet**. The agent does not operate it.

1. Open the public GitHub URL in incognito: repository, README, source and intended commit must be accessible to judges. Save a screenshot/time; local refs and an old public default branch are insufficient.
2. Repeat all routes above by typing their URLs, then hard reload; verify assets' decoded bytes/MIME/headers in DevTools. Check desktop and **375px** device emulation; inspect the console after each route. Label RPC/CORS/rate-limit failures as real failures/unavailable data, not successful coverage.
3. Click **Connect wallet**, connect through the installed injected extension, check the displayed account. Connection approval is not a transaction. Start on another chain: verify **“Wrong network. Trading requires Somnia Tokyo testnet (50383)”** and **“Switch to Somnia Tokyo testnet”** appear. Any wallet switch/add approval is made by the human; inspect chain **50383**, official RPC and STT. No transaction/message-sign request should appear during this smoke. Reconnect/disconnect and confirm no default bounty account appears.
4. Visit an explicit different public address while connected. It stays **read-only** and must not replace the extension's signer. Confirm empty/error states honestly if data are absent; no fake balance/PnL.
5. Pause landing motion, scroll to the architecture/workflow graphic, confirm stopped animation, then resume. Enable system reduced motion and confirm motion stays off. Check keyboard focus and mobile navigation/modal visibility.
6. **Reown:** for the established demo domain add exactly **`https://lucid-keeper.vercel.app`** (no trailing slash/path). If the deployment redirects to another/custom host, add **that effective origin** too; every used preview origin needs its own matching entry. Configure the project actually used by this build, ideally the owner's public project override. [Reown relay documentation](https://docs.reown.com/cloud/relay) says restricted origins are denied, an empty allowlist permits all origins, localhost is permitted and updates take about **15 minutes**. Rebuild/redeploy if the project ID changes; an allowlist-only change does not itself change the JS build.
7. Test WalletConnect with a human-owned phone, then injected fallback. A denied relay origin should not require WalletConnect to use an installed injected wallet. **Current UI lacks a specific Reown-origin/fallback explanation**; a generic connection failure/retry is not a verified diagnosis. Record this limitation and obtain owner sign-off or a separately authorized fix. Do not deliberately remove a production allowlist entry just to test denial.
8. Funding/trading/Guardian/close acceptance is a **separate** [MANUAL_QA](MANUAL_QA.md) task after [bounty-safe funding](FUNDING_VERIFICATION.md) is confirmed. Stop for missing STT/eligible USDso; no Arena credit or transfers.

## 4. Record acceptance, not merely execution

Record full deployment SHA/URL/time, Vercel source/alias evidence, byte-parity counts, headers, console status, desktop/mobile screenshots, injected/phone outcomes, Tokyo prompt and outstanding limitations. Keep raw diagnostic files local; add only reviewed public results to delivery docs. Do not mark production accepted if **FAIL/UNVERIFIED** gates remain. Deadline supplied by owner: **1 November 2026, 23:59 UTC**.

Local script verification results and remaining gates are recorded in [READ_ONLY_VERIFICATION](READ_ONLY_VERIFICATION.md), not represented as a new deployment.
