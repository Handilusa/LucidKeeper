# Absolute zero-mocks requirement is not met by the test suite

Severity: High — confirmed noncompliance with the user's repository-wide requirement; not evidence of a dreamDEX protocol defect.
Area: App / tests / acceptance criteria

## Reproduction
1. Inspect `package.json:17`, `test/broadcast.test.mjs:11-36` and `test/evidence.test.mjs`.
2. Inspect `test/e2e/terminal-fixture.ts:13-95,215-340` and its imports in `test/e2e/trading-ui.spec.ts`.
3. Observe mocked modules/recovery/RPC/filesystem/time, fulfilled network responses, injected wallet provider, synthetic financial data and transaction receipts.

## Expected
No mocks or fabricated transport results anywhere in the agreed scope, including tests. Pure mathematical test inputs are not transport mocks; this distinction does not exempt the existing doubles.

## Actual
The unit command enables experimental module mocks. Broadcast tests override sender recovery and RPC/evidence/policy boundaries. Playwright scenarios use fabricated market/account/receipt data and an injected provider. They are correctly isolated from runtime, but isolation does not satisfy an absolute zero-mocks mandate.

## Evidence
Source inspection and 66/66 unit tests passing on 30 October 2026. The 30/30 complete Playwright result at 11:22 UTC is a prior same-day result, not rerun by this review. Neither total is real wallet/fill evidence. Review evidence remains local under `.git/lucidkeeper-audit/completion-2026-10-30/`.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet, chain 50383; mocked in the affected tests
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; no real wallet connected
- Runtime / OS: Node 24.19.0 / Windows
- Status: Fixed locally 2026-10-30; real-service verification pending, explicit coverage gaps retained; not submitted

## Recommended next action
Replace transport-double coverage with pure offline tests and real read-only integration/browser checks. Real transaction coverage requires separate authorization and reviewed execution. Do not simply delete tests to make a zero-mocks claim. No tests or runtime code were changed in this review.

## Fix — 2026-10-30
The subsequent owner-authorized fix removes module/recovery/RPC/filesystem/time mocks, response fulfillment and injected wallets. Captured public Tokyo reads and historical canonical receipts label their sources; live read-only integration/browser tests have a write firewall. Former controlled scenarios remain explicit skips, with reasons and replacements in [TEST_DATA_SOURCES](../docs/TEST_DATA_SOURCES.md). This changes test coverage, not historical evidence or live execution permission.
