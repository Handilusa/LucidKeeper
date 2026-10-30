import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertReviewFresh, broadcastSignedTransaction } from '../src/lib/broadcast.mjs';
import { capture, historicalEnvelope } from './fixtures/captured.mjs';
import { runPolicyBoundaryProbe } from './helpers/run-policy-boundary-probe.mjs';

// Pure deadline arithmetic using the sourced capture's block time; no clock,
// RPC, sender recovery or transaction outcome is replaced.
const reviewTimestamp = BigInt(capture.provenance.block.timestamp);

test('approval review accepts thirty and forty-five minutes, up to one hour', () => {
  for (const seconds of [1800n, 2700n, 3600n])
    assert.doesNotThrow(() => assertReviewFresh(Number(reviewTimestamp + seconds), { action: 'approve' }, reviewTimestamp));
});

test('approval review rejects expired, invalid and over-one-hour deadlines', () => {
  for (const expiresAt of [Number(reviewTimestamp - 1n), Number(reviewTimestamp), Number(reviewTimestamp + 3601n), NaN, '2700'])
    assert.throws(() => assertReviewFresh(expiresAt, { action: 'approve' }, reviewTimestamp), /Review expired or outside/);
});

test('deposit review accepts five and fifteen minutes but never more than fifteen', () => {
  for (const seconds of [300n, 900n])
    assert.doesNotThrow(() => assertReviewFresh(Number(reviewTimestamp + seconds), { action: 'deposit' }, reviewTimestamp));
  for (const seconds of [901n, 1800n, 2700n])
    assert.throws(() => assertReviewFresh(Number(reviewTimestamp + seconds), { action: 'deposit' }, reviewTimestamp), /Review expired or outside/);
});

test('order review keeps its five-minute maximum after the deposit extension', () => {
  const intent = { action: 'order', expireTimestampNs: ((reviewTimestamp + 300n) * 1_000_000_000n).toString() };
  assert.doesNotThrow(() => assertReviewFresh(Number(reviewTimestamp + 300n), intent, reviewTimestamp));
  for (const seconds of [301n, 900n, 1800n, 2700n])
    assert.throws(() => assertReviewFresh(Number(reviewTimestamp + seconds), intent, reviewTimestamp), /Review expired or outside/);
});

test('the original five-minute deposit deadline still expires without extension', () => {
  const expiresAt = Number(reviewTimestamp + 300n);
  assert.doesNotThrow(() => assertReviewFresh(expiresAt, { action: 'deposit' }, reviewTimestamp + 299n));
  assert.throws(() => assertReviewFresh(expiresAt, { action: 'deposit' }, reviewTimestamp + 300n), /Review expired or outside/);
});

test('order calldata expiry remains live and no more than five minutes', () => {
  for (const seconds of [-1n, 0n, 301n, 2700n])
    assert.throws(() => assertReviewFresh(Number(reviewTimestamp + 300n), {
      action: 'order', expireTimestampNs: ((reviewTimestamp + seconds) * 1_000_000_000n).toString(),
    }, reviewTimestamp), /Order expired or expiry exceeds five minutes/);
});

test('the original approval deadline still expires despite the longer maximum', () => {
  const expiresAt = Number(reviewTimestamp + 2700n);
  assert.doesNotThrow(() => assertReviewFresh(expiresAt, { action: 'approve' }, reviewTimestamp + 2699n));
  assert.throws(() => assertReviewFresh(expiresAt, { action: 'approve' }, reviewTimestamp + 2700n), /Review expired or outside/);
});

test('absent or foreign wallet context prevents broadcaster transport creation', async () => {
  // No raw transaction/recovery/transport: actual first-action scope gate rejects.
  await assert.rejects(broadcastSignedTransaction(undefined), /Only the authorized bounty EOA/);
  const envelope = historicalEnvelope();
  for (const invalid of [{ ...envelope, from: capture.system.marginBank }, { ...envelope, chainId: 0 }, { ...envelope, from: undefined }])
    await assert.rejects(broadcastSignedTransaction({ envelope: invalid }), /Only the authorized bounty EOA/);
});

test('absent or foreign context makes zero real transport, evidence-write and send calls', () => {
  runPolicyBoundaryProbe('absent-foreign');
});

test('restored HOLD blocks authorized EOA/Tokyo before real transport, evidence writes or sends', () => {
  runPolicyBoundaryProbe('hold');
});

// Preserved test inventory: no synthetic recovery, RPC, receipt, time or filesystem.
// These integration branches require separately approved controlled real sends.
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
]) test(title, { skip: 'Former mocked send/recovery/preflight branch: requires separately approved real controlled transaction outcomes. No live execution in tests. See docs/TEST_DATA_SOURCES.md.' }, () => {});
