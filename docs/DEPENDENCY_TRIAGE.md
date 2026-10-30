# Dependency triage — 2026-10-30

`npm audit fix` ran **without `--force`**, exit 1, packages already up to date; no package/lockfile changes. No breaking upgrade, override or install-script approval was added. npm also reports a React 19 / nested `use-sync-external-store` peer warning; this is not a security advisory.

Fresh all/runtime JSON audits completed **13:15:58 UTC**. **27 affected package entries**, not 27 independent exploits: **17 high, 8 moderate, 2 low**, from **three advisory URLs**. `--omit=dev` reports the same set; **dev-only affected entries: 0**. npm's dependency classification does not prove that each transitive module ships in the browser or is exploitable.

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

**Conclusion:** no confirmed exploitable issue in LucidKeeper from these advisories, but not a security clearance. Wallet-provider input reachability/bounds and a tested upstream migration remain follow-up work. Do not publish exploit payloads or conduct live exhaustion testing as part of this fix. npm suggests RainbowKit downgrade, wagmi 3 and Zod 4 breaking changes; none applied.

Reproduce reports with `node scripts/audit-dependencies.mjs`. Full advisory JSON stays local under `.git/lucidkeeper-audit/dependencies-2026-10-30/`. No secrets or credentials are inspected by the script.
