# Security notes — 31 October 2026

**Not security-cleared.** `npm audit fix` ran without `--force` at approximately 12:28 UTC, exit 1, no package/lockfile changes. No install-script approvals, breaking upgrade or new override. Fresh saved audit: `.git/lucidkeeper-audit/dependencies-2026-10-31T12-28-28-216Z/`; command log `task4-audit-fix.log`.

| Scope | High | Moderate | Low | Critical | Total affected package entries |
| --- | ---: | ---: | ---: | ---: | ---: |
| All dependencies | 17 | 19 | 2 | 0 | 38 |
| `npm audit --omit=dev` | 17 | 8 | 2 | 0 | 27 |
| Development-only difference | 0 | 11 | 0 | 0 | 11 |

Entries include dependents of the same advisory, not 38 independent exploits. npm's runtime classification does not prove browser inclusion or reachability. Build packages currently listed under `dependencies` are not automatically app runtime services.

## Safe remediation review

- The official markets SDK remains pinned **0.32.1** and uses patched **Zod 4.6.7**. Root/connector `Zod 3.25.76` and nested Reown `3.22.4` remain affected by [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5). Advisory patched range starts at **4.6.6**; a blanket Zod 4 override would violate third-party Zod 3 API/peer requirements. Oversized constrained collections can cause memory exhaustion. No first-party Zod import, but wallet-service validation remains unproven reachable and **not dismissed**.
- [uuid GHSA-w5hq-g745-h8pq](https://github.com/advisories/GHSA-w5hq-g745-h8pq): installed 8.3.2/9.0.1; patched ≥11.1.1 changes major/API semantics. `npm view uuid@11.1.1 exports` confirms CJS/browser exports, but that alone does not prove all wallet callers compatible. No first-party uuid buffer API. No blanket major override; actual wallet SDK paths need upstream migration tests.
- [deepmerge GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4): vulnerable 4.3.1 in RainbowKit/styling, low severity; no compatible fix offered. No first-party attacker-controlled merge/theme API found. A suggested RainbowKit **0.1.0 downgrade** is not safe remediation.
- [minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): 3.1.5/10.2.6 in ESLint/TypeScript-eslint, **development/build tooling only**. Patched ≥11.0.1 is a major replacement of both current consumers; no arbitrary glob endpoint in the app. Avoid untrusted lint configuration/glob inputs; tested upstream tooling migration remains pending.
- npm's suggested wagmi **3.7.9** migration is breaking; not taken within a testnet execution release. Updating only pinned root viem does not remediate nested WalletConnect viem/Zod.

No compatible correction was available in the current constraints. Dependency changes are deliberately **zero**, not a claimed clean audit. Rebuild/types/lint/E2E types pass; unit/service **86 pass / 19 skip / 0 fail** and isolated multi-wallet/profile Chromium **14/14**. Browser artifacts `task4-browser/`; build/unit logs remain under the local audit directory. [Detailed inherited triage](DEPENDENCY_TRIAGE.md).

## Product boundaries

- No private keys, seeds or signing secrets in the frontend, tests, Git or evidence. Browser transactions require the user's wallet and independent unsigned review; public profiles never choose a signer.
- Connected-account/network lifetime guards prevent late UI results and dependent deposits after a switch; a transaction already handed to a wallet or submitted can still settle. They are not protocol-level cancellation or authentication.
- Tokyo 50383 only; exact approvals, official contract/market verification, bounded inputs and 300-second IOC/limit construction retained. IOC close has no guaranteed protocol reduce-only flag. Reverted receipt ≠ RPC error; confirmation ≠ fill.
- No backend/session-auth or global leaderboard. Browser-local aliases and observed-address lists can be edited by the local user and do not verify ownership. On-chain activity remains public.
- Guardian requires an active browser, fresh RPC, and wallet approvals; it is not a loss guarantee/always-on daemon. No stress/exhaustion testing against wallet, dreamDEX or Somnia services.

## Release decision

Owner must review and accept residual dependency risk before any testnet publication. Do not present this as a production/mainnet security audit. Real extension workflows, dependency input reachability, CSP/hosting headers and deployed artifact parity require separate checks. Do not put credentials into `VITE_*`: those values are public build output.
