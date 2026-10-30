# Runtime transaction paths do not consistently enforce the documented operating policy

Severity: High — source-confirmed safeguard divergence; not a reproduced unauthorized transaction or protocol exploit.
Area: App / operating policy / signing documentation

## Reproduction
1. Compare current local instructions and `docs/OFFLINE_SIGNING.md:3-20` with `src/lib/operating-policy.mjs:1-17`.
2. Inspect `App.tsx:42,270`, the write handlers in `TradingBox.tsx`, `PositionsTable.tsx`, `RiskGuardian.tsx` and `MarginHubModal.tsx`.
3. Inspect `scripts/prepare-margin.mjs:43-53` and `scripts/prepare-order.mjs:33-41` without executing preparation commands.

## Expected
One explicitly approved signer/funding policy, enforced consistently before every transaction path. Instruction-level HOLD remains binding until written user resolution. The unsigned handoff must contain chain/from/to/value/data/nonce/gas/fees/description.

## Actual
- Instructions retain HOLD; runtime `MARGIN_HOLD.active` is false and describes a historical release.
- React handlers directly request browser-wallet writes without importing the shared operating-policy gate. Connected-account gates check connection/network/read readiness, not the sole bounty EOA. This is a source finding; no other wallet was connected or operated.
- The UI implements cancellation/withdrawal/browser signing while the current offline allowlist/specification describes a narrower, user-mediated signer flow. These differences need an explicit decision, not an implicit expansion of authorization.
- Preparation CLIs return preview plans; they do not integrate the complete nonce/gas/EIP-1559 handoff envelope described in the signing specification. Pure envelope/validation libraries exist separately.

## Evidence
30 October 2026 source/document comparison at local HEAD `8b45899361096afaaa39ea141e013e6a014df0ef`. Existing historical receipts are genuine but cannot resolve current permission. No preparation, wallet connection, arming, claim, signature or broadcasting occurred.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet, chain 50383
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; reads only
- Runtime / OS: Node 24.19.0 / Windows
- Status: Runtime divergence fixed locally 2026-10-30; funding HOLD and offline CLI envelope integration remain blockers; not submitted

## Recommended next action
User resolves funding permission and signer model in writing; then align runtime enforcement and handoff integration without bypass flags. The review does not release HOLD or authorize any wallet operation.

## Fix — 2026-10-30
The owner's conditional authorization is recorded in STATUS. HOLD remains active because general execution permission is not written team-margin permission. Shared gates now protect browser trade/margin/close/Guardian, all three preparation CLIs and offline broadcasting. Only the authorized EOA/50383 may request reviewed exact-2-USDso funding or IOC; cancel/withdraw/limit/claims are not added to the allowlist. Browser requests show full unsigned JSON before wallet approval. Real first-gate broadcaster/CLI regressions require no mocks or transactions. Offline CLI complete-envelope integration remains unfinished and held.
