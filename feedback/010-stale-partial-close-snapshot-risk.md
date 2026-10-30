# Partial-close modal retains an outdated position snapshot

Severity: High potential financial impact — source-confirmed missing revalidation; harmful live outcome not reproduced.
Area: App / positions / partial close

## Reproduction
1. Inspect `PositionsTable.tsx:69,294-296`: opening Partial stores the entire `PositionItem` in component state.
2. Inspect `App.tsx:158-251`: portfolio polling supplies new position objects.
3. Inspect `PositionsTable.tsx:133-169,482-516`: modal submission continues to size/direction/price from the saved object, not a fresh chain position.
4. The risk scenario requires the actual position to shrink, disappear or reverse while the modal is open. This was **not** forced with a fixture or real transaction in this review.

## Expected
Reject a stale close review, reread current position/mark and present the revised reduction for approval. A close intent must not silently increase or reverse exposure.

## Actual
`canManage` can reflect a fresh successful parent query while `closePosition` remains older. Execution uses the old side and quantity and calls ordinary `placeOrder`, with no fresh position read or reduce-only argument. A changed net position could therefore receive an exposure-increasing order instead of the intended reduction. A final reread reduces risk but is not equivalent to protocol-enforced reduce-only execution.

## Evidence
Fix 2026-10-30: dialog stores only pool identity, resolves current parent reads and disables closed/unavailable state. Close/Guardian use fresh pinned raw position/mark/grid and recheck position size after review. `test/close.test.mjs` uses sourced historical bounty BTC snapshots for changed/flat/flipped cases; no fabricated positions or live close. Concurrent changes after preflight remain possible because the protocol call has no reduce-only flag.
30 October 2026 source inspection of the paths above. The public bounty account currently has zero positions; no nonempty modal/transaction reproduction was possible within the read-only scope. Offline-signing documentation identifies no reduce-only parameter in this order ABI. Do not report a reproduced flip or loss.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1
- Network: Somnia Tokyo testnet, chain 50383
- Public bounty account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`; no connected wallet
- Runtime / OS: Node 24.19.0 / Windows
- Status: Fixed locally 2026-10-30; no live close, post-preflight race disclosed; not submitted

## Recommended next action
Bind the modal to account/pool and invalidate its review when position state changes; revalidate raw on-chain size/direction/mark before any later approved close. Document the protocol limitation. No code was changed in this review.
