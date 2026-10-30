# Test data and coverage gaps — 2026-10-30

No fabricated successful wallets, balances, prices, fills, receipts or RPC responses are permitted. No financial module mocks, provider injection or response fulfillment remain. Deliberately malformed validator inputs and explicitly labeled mathematical scenarios are not financial observations. The explicitly authorized isolated HOLD-state injection below changes policy state only, not financial data or production gate implementations.

## Sources

- `test/fixtures/tokyo-public-reads.json`: public Tokyo RPC/official SDK 0.32.1 and dreamDEX GraphQL capture, 2026-10-30 12:47:20 UTC, block **37111800**. Every contract read includes address/function/arguments/block/result; indexer records include endpoint/query/variables/full result. Snapshot market-list data is indexed, not asserted to share the pinned RPC block.
- Historical approval/deposit/IOC receipts: canonical blocks **34042277**, **34042291**, **34044423**, public bounty EOA **0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA**. Unsigned public transaction fields only; signatures/raw transactions are not stored.
- 1000PEPE regression: real mark at block **37084078**, with block hash and market grid recorded. Historical BTC position snapshots retain block/transaction sources.
- Reproduce via `node scripts/capture-test-reads.mjs` (read-only; overwrites this reviewed capture only after all checks succeed).
- `dreamdex.test.mjs` performs real network, SDK market/account and mined public-transaction recovery reads. Public signature fields are read only into memory to reconstruct and verify the already-mined hash; no signing or sending.
- Playwright uses real HTTP services, real fonts and a read-only RPC/GraphQL firewall. There is no injected wallet. External outages fail tests rather than trigger fabricated fallbacks.

## Restored-HOLD and independent boundary observations

- `test/helpers/policy-boundary-probe.mjs` uses a Node child process and `registerHooks` to change only the single `active: false` policy-state declaration to `active: true` while loading that process's policy module. No production override/export/environment switch is added; the same production gate functions execute. Scoped-release tests remain unchanged in the parent process. Requires Node 22.15+ or 24+.
- Native Inspector function-entry breakpoints observe the actual viem `http`/`createPublicClient`/`sendRawTransaction`, application `saveEvidence` and real filesystem `mkdir`/`writeFile` functions, without replacing arguments/results. Observers are calibrated with real client creation (no RPC calls), an invalid Symbol filename entering `saveEvidence` without writing evidence, and an owned Git-metadata calibration file that is removed. Send observation is armed but no send is executed as a positive control.
- During the rejected-action measurement window, all six counts must be zero for absent/foreign contexts, restored HOLD with the authorized EOA/Tokyo context, and three CLI imports given the bounty EOA as arguments. Historical unsigned envelope fields are used; no raw transaction/signature is fabricated or submitted.
- These are first-gate regressions, not downstream race/live-execution proof. CLIs currently reject before wallet arguments are parsed; the test proves HOLD precedence, not a complete CLI handoff.

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

Only the expressly authorized isolated restored-HOLD state injection above is used in tests; there is no production override or financial/RPC substitution. The owner's wallet-scoped release is a production policy decision, not transaction approval. Coverage gaps are release/demo limitations, not proof of safe live execution. Public captures are historical, not current balances or positions.

## Latest verification totals

30 October full-suite rerun at clean `c49bdec`: **56 passed / 21 skipped / 0 failed**, 77 cases/14 files. With three additional HOLD/boundary regressions: **59 passed / 21 skipped / 0 failed**, 80 cases/14 files, including actual services. Prior real-service browser verification remains **14 passed / 16 skipped / 0 failed**, not rerun in this test update. Prior 66/66 and 30/30 double-based results remain historical only. Partial-close/IOC captures do not prove a live close or protocol reduce-only protection.
