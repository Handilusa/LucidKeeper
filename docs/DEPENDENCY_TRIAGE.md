# Dependency triage — 2026-10-31

**Release-blocker task 4 update, 12:28 UTC:** reran `npm audit fix` **without `--force`**, exit1/no package or lockfile changes. Fresh all/runtime audit remains38/27 entries with11 dev-only. Safe targeted review found no compatible advisory fixes within installed consumers; no breaking overrides or install-script approvals. Detailed current risk/decision: [SECURITY_NOTES](SECURITY_NOTES.md). Saved JSON `.git/lucidkeeper-audit/dependencies-2026-10-31T12-28-28-216Z/`. Statements below about no31Octfix describe the earlier audit only.

On **30 October**, `npm audit fix` ran **without `--force`**, exit 1, packages already up to date; no package/lockfile changes. No breaking upgrade, override or install-script approval was added. npm also reported a React 19 / nested `use-sync-external-store` peer warning; this is not a security advisory. No remediation/install ran in the 31 October audit.

Fresh **31 October** all/runtime JSON audits completed **11:27 / 11:29 UTC**, both exit1. All dependencies: **38 affected package entries (17 high,19 moderate,2 low,0 critical)**; runtime `--omit=dev`: **27 (17 high,8 moderate,2 low)**. **11 dev-only moderate entries**, from the new minimatch advisory; **four distinct advisory URLs total, three runtime**. These are not independent exploit counts. npm's dependency classification does not prove that each transitive module ships in the browser or is exploitable. This supersedes the 30 October27-total/0-dev-only count.

## Dev-only entries

`minimatch`, `eslint`, `@eslint-community/eslint-utils`, `@eslint/config-array`, `@eslint/eslintrc`, `typescript-eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `@typescript-eslint/type-utils`, `@typescript-eslint/typescript-estree`, `@typescript-eslint/utils`. This dependency path is tooling; not evidence of a browser exposure.

## Remaining runtime dependency entries

- `@coinbase/cdp-sdk`, `@gemini-wallet/core`
- `@metamask/rpc-errors`, `@metamask/sdk`, `@metamask/sdk-communication-layer`, `@metamask/utils`
- `@rainbow-me/rainbowkit`, `@vanilla-extract/css`, `deepmerge`
- `@reown/appkit`, `@reown/appkit-controllers`, `@reown/appkit-pay`, `@reown/appkit-scaffold-ui`, `@reown/appkit-ui`, `@reown/appkit-utils`, `@reown/appkit-wallet`
- `@wagmi/connectors`, `wagmi`
- `@walletconnect/core`, `@walletconnect/ethereum-provider`, `@walletconnect/sign-client`, `@walletconnect/universal-provider`, `@walletconnect/utils`
- `abitype`, nested `viem`, `uuid`, `zod`

The root viem is pinned to 2.57.11; the reported viem paths are older nested WalletConnect copies. Upgrading only the root does not remove these transitive findings.

## Exploitability here

| Advisory | Required vulnerable use | App-specific assessment |
| --- | --- | --- |
| [deepmerge / low](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) | Merge attacker-controlled source keys into an object and subsequently trust inherited properties | Comes through RainbowKit/vanilla-extract styling. No first-party deepmerge call, user theme import or public merge endpoint found. No demonstrated reachable exploit; do not infer global object pollution or transaction compromise from package presence. Advisory lists no patched version. |
| [uuid / moderate](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | Call v3/v5/v6 with a caller-provided undersized output buffer or invalid offset | MetaMask/Gemini/connector graph contains old versions. No first-party uuid call or external UUID buffer API found; project evidence uses Node `randomUUID`, which is not this package. No demonstrated vulnerable buffer path here. Patched uuid majors may break upstream CommonJS/API contracts, so no blanket override. |
| [Zod / high](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) | Validate oversized collections with excessive per-element issue allocation | No first-party Zod imports or public Zod validation server found. Third-party wallet/ABI/CDP validation remains; CDP contains array schemas. No end-to-end attacker-controlled input path has been established or stress-tested. A malicious/compromised wallet service could potentially cause browser resource exhaustion if these validators are reachable without effective input bounds. This residual risk is **not dismissed**; HOLD does not prevent read-only or connection DoS. |
| [minimatch / moderate](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Process pathological glob patterns, amplifying work through glob parts; reported range `<11.0.1` | Dev-only ESLint/TypeScript-eslint dependency path in this audit. No first-party minimatch import or runtime glob API found. Untrusted tooling inputs and a compatible upstream fix still need review; no exhaustion test or blanket major override applied. |

**Conclusion:** no confirmed exploitable issue in LucidKeeper from these advisories, but not a security clearance. Wallet-provider input reachability/bounds and a tested upstream migration remain follow-up work. Do not publish exploit payloads or conduct live exhaustion testing as part of this fix. npm suggests RainbowKit downgrade, wagmi 3 and Zod 4 breaking changes; none applied.

Reproduce with `npm audit --json` and `npm audit --omit=dev --json` (both currently exit1), or `node scripts/audit-dependencies.mjs` for a saved report. The reporting script uses a fresh timestamped directory and does not signify security clearance when it finishes. Fresh logs/summary: `.git/lucidkeeper-audit/pre-push-2026-10-31/`; historical JSON remains in `.git/lucidkeeper-audit/dependencies-2026-10-30/`. No secrets or credentials are inspected by the script. A tested dependency migration is still required before a security-cleared release.
