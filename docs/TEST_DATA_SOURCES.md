# Test data and coverage gaps — 2026-10-30

No fabricated successful wallets, balances, prices, fills, receipts or RPC responses are permitted. No module mocks, provider injection or response fulfillment remain. Deliberately malformed validator inputs and explicitly labeled mathematical scenarios are not financial observations.

## Sources

- `test/fixtures/tokyo-public-reads.json`: public Tokyo RPC/official SDK 0.32.1 and dreamDEX GraphQL capture, 2026-10-30 12:47:20 UTC, block **37111800**. Every contract read includes address/function/arguments/block/result; indexer records include endpoint/query/variables/full result. Snapshot market-list data is indexed, not asserted to share the pinned RPC block.
- Historical approval/deposit/IOC receipts: canonical blocks **34042277**, **34042291**, **34044423**, public bounty EOA **0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA**. Unsigned public transaction fields only; signatures/raw transactions are not stored.
- 1000PEPE regression: real mark at block **37084078**, with block hash and market grid recorded. Historical BTC position snapshots retain block/transaction sources.
- Reproduce via `node scripts/capture-test-reads.mjs` (read-only; overwrites this reviewed capture only after all checks succeed).
- `dreamdex.test.mjs` performs real network, SDK market/account and mined public-transaction recovery reads. Public signature fields are read only into memory to reconstruct and verify the already-mined hash; no signing or sending.
- Playwright uses real HTTP services, real fonts and a read-only RPC/GraphQL firewall. There is no injected wallet. External outages fail tests rather than trigger fabricated fallbacks.

## Preserved gaps — skipped, not passing

The previous scenarios remain named in the test runner. Their controlled outcomes cannot be replayed from a successful historical receipt alone. No tests were silently removed; grouped pure-math cases now use captured inputs. Earlier fixture-suite totals are historical and are not current coverage claims.

| File / scenarios | Why not runnable without a double or additional real source |
| --- | --- |
| `broadcast.test.mjs`: fake recovery/success, review/expiry before transport, wrong chain/nonce/code/gas/simulation, insufficient funds/allowance, factory/grid/auto-pull rejection, HOLD/nonce changes during awaits, input mutation during awaits, pending/uncertain/timeouts/reverts/foreign or noncanonical receipts | Exercising downstream branches requires separately approved controlled real send outcomes or boundary substitution. Tests never execute live transactions. After the owner-confirmed wallet-scoped release, real first-action regressions reject absent/foreign wallet/network context without raw payloads, transport or overrides; a recorded response is not an actual send or race. |
| `offline-transactions.test.mjs`: zero nonce/priority-fee capture, all-field synthetic raw rejection, synthetic signature recovery, inactive-HOLD broadcasting | No matching zero-fee captured transaction; successful sender and gas/fee/nonce mismatch plus malformed raw validation use a real mined transaction in `dreamdex.test.mjs`. The scoped release does not authorize live broadcasting in tests. |
| `dreamdex-unit.test.mjs`: combined mocked open/network/filesystem case | Replaced by actual SDK/network reads in `dreamdex.test.mjs` and concurrent real filesystem writes in `evidence.test.mjs`; old combined case is retained as a migration marker, not extra coverage. |
| `dreamdex.test.mjs`: resting-only receipt | Reviewed capture contains a filled IOC, not a resting-only placement. Needs a sourced genuine resting receipt or approved live limit order. Wrong-chain and reverted-order branches are not certified by Tokyo success. |
| `math.test.mjs`: accrued funding rounding | Capture does not contain both required cumulative funding indexes for the same position snapshot. A rate is not a cumulative index. |
| Playwright: connected sizing/Max, position/share dialog, forced chart/history failures and pagination, stale/recovery reads, wrong-network recovery, three collateral sequencing outcomes, wallet rejection/confirmation, partial close, cache account isolation, absent parameters, four-hour funding/simulation failure, armed Guardian/account isolation, controlled price motion/slow reads | No configured real connected signer or nonempty current position, and no approved controlled network/wallet failures. These scenarios remain explicit skips in `trading-ui.spec.ts`. Real read-only market/keyboard/chart/modal/responsive checks replace fabricated success cases; pure regressions cover captured arithmetic separately. |

HOLD/policy is never overridden by tests. The owner's subsequent wallet-scoped release is a production policy decision, not a test override or transaction approval. Coverage gaps are release/demo limitations, not proof of safe live execution. Public captures are historical, not current balances or positions.

## Latest verification totals

30 October fix verification: **56 unit/integration passed, 21 explicitly skipped, 0 failed**; **14 local real-service Chromium passed, 16 explicitly skipped, 0 failed**, five sizes, no retries. Prior 66/66 and 30/30 double-based results remain historical only. Partial-close changed/flat/flipped coverage uses sourced historical BTC positions; IOC regressions use captured raw marks/grids, including all 21 markets. These regressions do not exercise a live close or protocol reduce-only protection.
