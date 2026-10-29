# Production origin rejected by Reown configuration

**Status:** Resolved for production configuration, **29 October 2026, 20:34 UTC**. Actual wallet connection/signing remains untested; prior observations below are retained as history.

- **Severity:** Medium — wallet integration configuration; connection impact not tested.
- **Area:** Deployment / RainbowKit–WalletConnect / Reown; not a reproduced dreamDEX protocol defect.
- **Observed:** 29 October 2026, 15:53–15:55 UTC; repeated in five fresh browser contexts after user deployment confirmation.
- **Environment:** `https://lucid-keeper.vercel.app/`; Chromium 156.0.8078.4 on Windows; markets SDK 0.32.1; Somnia Tokyo 50383; public bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` displayed read-only. No injected/connected wallet.
- **Reproduction:** Open the deployed URL in a fresh profile. Inspect console and network without connecting a wallet. Remote configuration `https://api.web3modal.org/appkit/v1/config` and telemetry `https://pulse.walletconnect.org/e` return HTTP 403.
- **Expected:** The deployed origin is accepted by the intended Reown project, and remote configuration loads without origin-allowlist errors.
- **Actual:** Console reports `Origin https://lucid-keeper.vercel.app/ not found on Allowlist - update configuration on cloud.reown.com` and remote configuration falls back to local/default values. Market, account and candle reads still succeeded; this audit does **not** prove wallet connection/signing fails. The cause of the telemetry 403 beyond the observed response is not independently established.
- **Evidence:** Current settled QA in [validation](../docs/LUCIDKEEPER_REDESIGN_VALIDATION.md); local `report.json` and `summary.json` under `.git/lucidkeeper-audit/settled-deployed-2026-10-29T15-53-19-687Z/`. These are new deployed observations, not historical localhost-origin errors.
- **Follow-up:** The project owner should confirm the deployed WalletConnect project selection and configure its production-origin allowlist. `src/chain/wagmiConfig.ts:5–6` uses a build-time project selection with a development fallback; this audit did not inspect environment files or prove which selection the build used. No cloud login, credentials, configuration change or wallet operation was attempted.

## Authorized follow-up — 29 October 2026, 16:33 UTC

- User supplied public Project ID `006c638cc6ec95a3982952a1ee86aa05`, confirmed allowlisting and twice reported Vercel redeployment. These dashboard/deployment actions are user-reported, not independently inspected settings.
- Local source now defaults to this ID instead of the shared development project; `VITE_WALLETCONNECT_PROJECT_ID` still overrides it. New local production preview: **5/5 focused read-only checks pass**, config request uses the supplied ID and returns **200**; telemetry returns **202**; no console/page errors. Unit **65/65**, typecheck, lint and build pass.
- Latest fresh production observation at **16:33:09–16:33:12 UTC** still sends **`3fcc6bba2d1de962d911bb5b5c3dba68`** to config and telemetry; both return **403**, with the production-origin allowlist error. Document200 and disconnected data reads succeed; **2/5 checks pass**. **Issue remains open on production.** No wallet connection/signing test.
- Evidence: local `.git/lucidkeeper-audit/reown-local-2026-10-29T16-33-09-033Z/report.json` and deployed `reown-deployed-2026-10-29T16-33-09-008Z/report.json`. The earlier 16:29 report is preserved; its disabled-Connect-button assertion was an audit mistake, not a source defect.
- Owner action: select the supplied ID in Vercel **Production** `VITE_WALLETCONNECT_PROJECT_ID`, then redeploy. A local source change alone is not published; existing environment overrides can supersede the default. No cloud/environment files inspected, no agent push or settings change; exact cause of old-ID selection is not established.

## Production resolution verified — 29 October 2026, 20:34 UTC

- Fresh browser at effective `https://lucid-keeper.vercel.app/`: **5/5 focused read-only checks PASS**. Live config request now uses `006c638cc6ec95a3982952a1ee86aa05` and returns **200**; telemetry uses the same ID and returns **202**. No Reown allowlist/config errors, other console warnings/errors, page exceptions or write attempts observed. Document200 and disconnected market/account reads settle.
- Evidence: `.git/lucidkeeper-audit/reown-deployed-2026-10-29T20-34-19-332Z/report.json`, 20:34:19–20:34:25 UTC. Earlier old-ID/403 observations are historical, not the current outcome. The exact timing/cause of deployment availability was not established; do not claim a confirmed cache or propagation defect.
- No further configuration change needed for the observed production origin. Actual wallet connection/relay/signing behavior was not exercised. No cloud login, app source changes, signatures, transactions or push during this confirmation.
