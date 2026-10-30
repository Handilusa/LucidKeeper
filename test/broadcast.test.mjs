import { test } from 'node:test';
import assert from 'node:assert/strict';
import { broadcastSignedTransaction } from '../src/lib/broadcast.mjs';
test('HOLD prevents transport creation, evidence writes and sends', async () => {
  // No input, transport or mocked recovery: the real first-action gate rejects.
  await assert.rejects(broadcastSignedTransaction(undefined), /HOLD:/);
});

// Preserved test inventory: no synthetic recovery, RPC, receipt, time or filesystem.
// These integration branches cannot execute under HOLD without controlled sends.
// See docs/TEST_DATA_SOURCES.md. Skips are gaps, never passing transaction evidence.
for (const title of [
  'mocked recovered sender permits an exact wire match without real signing',
  'review mismatch and expired requests stop before creating transport',
  'fake success uses only pinned RPC, disables retries and records canonical confirmation without fill claims',
  'wrong chain, nonce, delegated account, gas and simulation fail before send',
  'funding checks reject wrong collateral, absent USDso and unconfirmed deposit allowance',
  'orders require official factory membership, current grid, deposited margin and no auto-pull allowance',
  'HOLD and pending nonce are checked again after preflight before send',
  'HOLD restored during the final nonce read still prevents a send',
  'input is snapshotted before awaits so later mutations cannot change the send',
  'pending or unverifiable receipts stay unconfirmed',
  'ambiguous send errors are sanitized, queried by computed hash, and never resent',
  'timeout may still resolve to a receipt; a reverted receipt is recorded as reverted',
  'noncanonical and foreign receipts cannot become confirmed evidence',
]) test(title, { skip: 'Former mocked send/recovery/preflight branch: requires real controlled transaction outcomes; HOLD forbids live execution. See docs/TEST_DATA_SOURCES.md.' }, () => {});
