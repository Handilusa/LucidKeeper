# Production origin rejected by Reown configuration

- **Severity:** Medium — wallet integration configuration; connection impact not tested.
- **Area:** Deployment / RainbowKit–WalletConnect / Reown; not a reproduced dreamDEX protocol defect.
- **Observed:** 29 October 2026, 15:53–15:55 UTC; repeated in five fresh browser contexts after user deployment confirmation.
- **Environment:** `https://lucid-keeper.vercel.app/`; Chromium 156.0.8078.4 on Windows; markets SDK 0.32.1; Somnia Tokyo 50383; public bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` displayed read-only. No injected/connected wallet.
- **Reproduction:** Open the deployed URL in a fresh profile. Inspect console and network without connecting a wallet. Remote configuration `https://api.web3modal.org/appkit/v1/config` and telemetry `https://pulse.walletconnect.org/e` return HTTP 403.
- **Expected:** The deployed origin is accepted by the intended Reown project, and remote configuration loads without origin-allowlist errors.
- **Actual:** Console reports `Origin https://lucid-keeper.vercel.app/ not found on Allowlist - update configuration on cloud.reown.com` and remote configuration falls back to local/default values. Market, account and candle reads still succeeded; this audit does **not** prove wallet connection/signing fails. The cause of the telemetry 403 beyond the observed response is not independently established.
- **Evidence:** Current settled QA in [validation](../docs/LUCIDKEEPER_REDESIGN_VALIDATION.md); local `report.json` and `summary.json` under `.git/lucidkeeper-audit/settled-deployed-2026-10-29T15-53-19-687Z/`. These are new deployed observations, not historical localhost-origin errors.
- **Follow-up:** The project owner should confirm the deployed WalletConnect project selection and configure its production-origin allowlist. `src/chain/wagmiConfig.ts:5–6` uses a build-time project selection with a development fallback; this audit did not inspect environment files or prove which selection the build used. No cloud login, credentials, configuration change or wallet operation was attempted.
