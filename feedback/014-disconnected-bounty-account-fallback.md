# Disconnected visitors inherit the bounty account's activity

Severity: High — account misattribution in a trading interface; public positions and balances appeared to belong to a visitor who had not connected a wallet. This is not a private-data breach or proof of unauthorized execution.
Area: LucidKeeper account selection in the React terminal, portfolio and compatibility HTTP service; not a demonstrated dreamDEX protocol defect.

## Steps to reproduce
1. Before this local fix, open `/app` with no wallet connected.
2. Inspect account funds, positions, activity and Guardian health; open `/app/profile`.
3. Request `/api/status` from the compatibility server without an `address` parameter.

## Expected
No selected account while disconnected. Visitors may inspect public market data; account-specific views require their connected address. An HTTP account read must require an explicit valid address.

## Actual
The user reported seeing the bounty wallet's active trades while disconnected. Source inspection confirmed implicit fallbacks in `App.tsx` (`address || bountyEOA`), `Profile.tsx` (`address || PROJECT.account`) and `ui-server.mjs` (default `BOUNTY_EOA`). Labeling some views as read-only/watch did not meet the requirement for each visitor's own account data.

## Evidence
- Fix: remove all three implicit selections; disable disconnected account queries, clear account presentation and render connection-required states. Stale/error position snapshots are not rendered.
- `test/e2e/account-scope.spec.ts`: real-service Chromium at 375/1440px checks empty account tabs/funds/profile, disabled account refresh/exports, connection modal and zero account RPC/GraphQL requests. No injected wallet or fabricated financial responses.
- Passing screenshots: `.git/lucidkeeper-audit/account-scope-browser-fixed/` (account/profile disconnected captures). Desktop full-page terminal capture has a sticky-header capture overlap; mobile and profile captures remain readable.
- Read-only verification **31 October 2026, 11:22:09–11:22:20 UTC**: five HTTP requests on `127.0.0.1:4181`; no address → HTTP200/`account:null`/21 markets, malformed address → HTTP400, two explicit addresses → their respective accounts, then no address → `account:null` again. Every response uses `Cache-Control: no-store`.
- Public-read artifact: `.git/lucidkeeper-audit/account-scope-public-reads-2026-10-31T11-22-09.928Z.json`. Production-source GraphQL queries return 15 fills/21 margin events belonging to the bounty address; zero records for the foreign public read identity. Active-order queries succeed with zero rows, so nonempty active-order ownership is not independently exercised.
- Full suite: **72 passed / 21 skipped / 0 failed**; browser suite **22 passed / 17 skipped / 0 failed**. Typecheck/lint/build/server syntax pass. No live transaction was prepared, signed or sent. Not deployed or submitted.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1; wagmi 2; React 19.
- Network: Somnia Tokyo testnet, chain ID 50383; actual public RPC/indexer.
- Wallet: none connected. Historical/default public account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- Foreign HTTP read identity: BTC pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`, not a signing wallet.
- Runtime / OS: Node 24.19.0, Playwright Chromium, Windows; local production preview and compatibility server.
- Status: fixed locally, uncommitted on `feat/landing-and-profile`; publication remains owner-managed. Account-scoped display does not provide on-chain privacy.
