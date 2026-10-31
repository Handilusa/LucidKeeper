# Browser account state and pending reviews need identity boundaries

Severity: Medium — a shared leverage preference can affect another wallet's order sizing; unscoped transient state and captured wallet checks risk retaining a previous account's context. No cross-wallet transaction was observed or sent.
Area: LucidKeeper browser preferences, account UI lifecycle, query/receipt caches and asynchronous transaction review; not a demonstrated dreamDEX protocol defect.

## Steps to reproduce
1. Before this fix, set leverage for a market; inspect the market-only storage key `lucidkeeper_leverage_<pool>`.
2. Reuse that browser with another wallet: the same key is read regardless of owner. A disconnected visit also reads it.
3. Inspect account component lifetimes and asynchronous write paths: a request captures an address before awaits, but previously lacked a final live `getAccount(wagmiConfig)` identity check.

## Expected
Preferences belong to the normalized address and Tokyo read network. Disconnect/account/network changes reset transient dialogs, draft values, risk controls and receipt presentation. A stale reviewed address must not be dispatched after a wallet/network change.

## Actual
Source inspection confirmed leverage was persisted per market only and account component lifetimes did not consistently include connection/network state. Existing receipt caches already included the address; they were not a reproduced cross-wallet leak, but lacked an explicit chain namespace. The missing live-wallet check is a defensive race finding, not evidence of an executed wrong-wallet trade. Selected leverage also fed unused inferred position margin/leverage fields; those are removed rather than treated as protocol position facts.

## Evidence
- `accountScope.ts` centralizes validated connected identity, account/network lifetimes, scoped storage keys and live-account matching. Terminal/profile lifetimes reset on disconnect, account or network changes. Queries/cache keys include Tokyo 50383 and normalized owner.
- Leverage, aliases, receipt/history caches and Guardian settings use wallet-scoped keys. Legacy entries are retained on disk but not imported into the new scopes.
- `browser-policy.ts` checks the live wallet before review and at completion; all four browser write entry points check again immediately before dispatch. Existing bounty EOA/HOLD/allowlist policy remains unchanged. This does not prevent wallet changes after dispatch or guarantee provider behavior.
- `test/account-scope.test.mjs`: six pure/captured/source regressions, including distinct account/network keys, rejection of absent/foreign identity and a real TanStack Query observer receiving late captured data only under the previous account's cache key.
- `test/e2e/account-scope.spec.ts`: a legacy market-only leverage value is neither loaded nor overwritten in a disconnected real browser; changing draft leverage creates no wallet preference and reload restores the default draft.
- Terminal indexer history/order parsers reject rows not owned by the requested account. Public query-schema/owned-history reads verified **31 October 2026, 11:22 UTC**; empty active-order responses do not certify nonempty parsing.
- Full suite **72 passed / 21 skipped / 0 failed**; Chromium **22 passed / 17 skipped / 0 failed**. Actual connected-wallet switching, armed Guardian transitions and signing races remain unexercised; historical controlled cases remain explicit skips. No signing, preparation or sends.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1; wagmi 2; TanStack Query 5; React 19.
- Network: Somnia Tokyo testnet, chain ID 50383.
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; no wallet connected in browser tests.
- Pure tests use sourced public addresses/captured account data, never a signing key or injected successful wallet.
- Runtime / OS: Node 24.19.0, Playwright Chromium, Windows.
- Status: local uncommitted fix on `feat/landing-and-profile`, not deployed/submitted. No widening of the execution allowlist.
