import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertReviewFresh, broadcastSignedTransaction } from '../src/lib/broadcast.mjs';
import { capture, historicalEnvelope, amount, approval, bigintGrid, btc, decodedOrder, order } from './fixtures/captured.mjs';
import { runPolicyBoundaryProbe } from './helpers/run-policy-boundary-probe.mjs';
import { createBroadcastHarness, RAW_SENTINEL } from './helpers/broadcast-harness.mjs';

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

// These 13 scenarios execute the actual broadcaster with isolated import boundaries.
// Controlled send/recovery outcomes are never real transaction or fill evidence.
test('controlled recovered sender permits an exact reviewed request without signing', async () => {
  const h = await createBroadcastHarness();
  const result = await h.broadcast();
  assert.equal(result.state, 'confirmed');
  assert.equal(h.calls('controlled-recovery').length, 1);
  assert.deepEqual(h.calls('controlled-recovery')[0].args.envelope, h.state.envelope);
  assert.deepEqual(h.calls('controlled-send').map(call => call.args), [{ serializedTransaction: RAW_SENTINEL }]);
});

test('review mismatch and expired requests stop before creating transport', async () => {
  for (const options of [{ reviewMismatch: true }, { expiresAt: 0 }]) {
    const h = await createBroadcastHarness(options);
    await assert.rejects(h.broadcast(), /differs from reviewed|Review expired/);
    for (const name of ['transport', 'client', 'controlled-send', 'controlled-evidence']) assert.equal(h.calls(name).length, 0);
  }
});

test('controlled success pins RPC, disables retries and records canonical confirmation without fill claims', async () => {
  const h = await createBroadcastHarness();
  const result = await h.broadcast();
  assert.deepEqual(h.calls('transport')[0].args, { url: 'https://api.hideki2.infra.testnet.somnia.network', options: { retryCount: 0, timeout: 15000 } });
  assert.equal(result.state, 'confirmed'); assert.equal(result.fillVerified, false);
  assert.deepEqual(h.state.evidence.map(item => item.state), ['validated-not-sent', 'submitted', 'confirmed']);
  assert.deepEqual(h.calls('canonical')[0].args, { blockNumber: approval.receipt.blockNumber });
  assert.ok(h.state.calls.findIndex(call => call.name === 'controlled-evidence') < h.state.calls.findIndex(call => call.name === 'controlled-send'));
  for (const call of h.calls('nonce')) assert.deepEqual(call.args, { address: capture.account.address, blockTag: 'pending' });
});

test('wrong chain, nonce, delegated account, gas and simulation fail before send', async () => {
  for (const options of [{ chain: 1 }, { pendingNonce: -1 }, { code: '0x01' }, { balance: 0n },
    { baseFee: 10n ** 30n }, { estimate: 0n }, { estimate: 10n ** 30n }, { simulationError: true }]) {
    const h = await createBroadcastHarness(options);
    await assert.rejects(h.broadcast(), /^Error: Broadcast preflight failed; refresh public state and review the envelope$/);
    assert.equal(h.calls('controlled-send').length, 0); assert.equal(h.state.evidence.length, 0);
  }
});

test('funding checks reject wrong collateral, absent USDso and unconfirmed deposit allowance', async () => {
  for (const options of [{ system: { collateralToken: capture.system.marginBank } }, { system: { fullyWired: false } },
    { collateralBalance: 0n }, { decimals: 8 }, { allowance: 1n }]) {
    const h = await createBroadcastHarness(options);
    await assert.rejects(h.broadcast(), /Broadcast preflight failed/); assert.equal(h.calls('controlled-send').length, 0);
  }
  const h = await createBroadcastHarness(); h.deposit();
  await assert.rejects(h.broadcast(), /Broadcast preflight failed/); assert.equal(h.calls('controlled-send').length, 0);
  const funded = await createBroadcastHarness({ allowance: amount }); funded.deposit();
  assert.equal((await funded.broadcast()).state, 'confirmed'); assert.equal(funded.calls('controlled-send').length, 1);
});

test('orders require official factory membership, current grid, deposited margin and no auto-pull allowance', async () => {
  for (const options of [{ member: false }, { bank: capture.system.collateralToken }, { grid: { ...bigintGrid(btc), lotSize: 0n } },
    { grid: { ...bigintGrid(btc), tickSize: decodedOrder.args[2] + 1n } }, { margin: 0n }, { allowance: 1n }]) {
    const h = await createBroadcastHarness(options); h.order();
    await assert.rejects(h.broadcast(), /Broadcast preflight failed/); assert.equal(h.calls('controlled-send').length, 0);
  }
  const h = await createBroadcastHarness(); h.order();
  assert.equal((await h.broadcast()).state, 'confirmed');
  assert.deepEqual(h.calls('isDeployedByFactory')[0].args.args, [order.transaction.to]);
  assert.equal(h.calls('controlled-send').length, 1);
});

test('HOLD and pending nonce are checked again after preflight before send', async () => {
  const held = await createBroadcastHarness();
  held.state.onEvidence = data => { if (data.state === 'validated-not-sent') held.state.hold = true; };
  await assert.rejects(held.broadcast(), /HOLD/); assert.equal(held.calls('controlled-send').length, 0);
  assert.deepEqual(held.state.evidence.map(item => item.state), ['validated-not-sent']);
  const stale = await createBroadcastHarness({ finalNonce: -1 });
  await assert.rejects(stale.broadcast(), /Pending nonce changed before send/);
  assert.equal(stale.calls('controlled-send').length, 0); assert.equal(stale.state.nonceCalls, 2);
});

test('HOLD restored during the final nonce read still prevents a send', async () => {
  const h = await createBroadcastHarness(); h.state.onFinalNonce = () => { h.state.hold = true; };
  await assert.rejects(h.broadcast(), /HOLD/);
  assert.equal(h.calls('controlled-send').length, 0); assert.equal(h.state.nonceCalls, 2);
});

test('input is snapshotted before awaits so later mutations cannot change the send', async () => {
  const h = await createBroadcastHarness(); const input = h.request(); const reviewed = structuredClone(input);
  h.state.onLatest = async () => {
    input.envelope.nonce = 999999; input.envelope.fees.maxFeePerGas = '1';
    input.intent.amount = '1'; input.raw = 'CHANGED'; input.expiresAt = 0;
    h.state.envelope = reviewed.envelope;
  };
  assert.equal((await h.broadcast(input)).state, 'confirmed');
  assert.deepEqual(h.calls('controlled-recovery')[0].args.envelope, reviewed.envelope);
  const estimate = h.calls('estimate')[0].args;
  assert.equal(estimate.nonce, reviewed.envelope.nonce); assert.equal(estimate.maxFeePerGas.toString(), reviewed.envelope.fees.maxFeePerGas);
  assert.equal(h.calls('controlled-send')[0].args.serializedTransaction, reviewed.raw);
});

test('pending or unverifiable receipts stay unconfirmed', async () => {
  for (const [options, expected] of [[{ receiptError: true }, 'pending'], [{ canonicalError: true }, 'receipt-unverified']]) {
    const h = await createBroadcastHarness(options);
    assert.equal((await h.broadcast()).state, expected); assert.equal(h.calls('controlled-send').length, 1);
    assert.equal(h.state.evidence.at(-1).state, expected); assert.ok(!h.state.evidence.some(item => item.state === 'confirmed'));
  }
});

test('ambiguous send errors are sanitized, queried by computed hash, and never resent', async () => {
  for (const options of [{ sendError: true, receiptError: true }, { sendHash: order.hash, receiptError: true }]) {
    const h = await createBroadcastHarness(options); const result = await h.broadcast();
    assert.equal(result.state, 'send-uncertain'); assert.equal(result.hash, capture.execution[0].hash);
    assert.equal(h.calls('controlled-send').length, 1); assert.equal(h.calls('receipt').length, 1);
    assert.equal(h.calls('receipt')[0].args.hash, result.hash);
    const stored = JSON.stringify(h.state.evidence, (_, value) => typeof value === 'bigint' ? value.toString() : value);
    for (const forbidden of ['sensitive upstream', RAW_SENTINEL, 'serializedTransaction']) assert.ok(!stored.includes(forbidden));
  }
});

test('timeout may still resolve to a receipt; a reverted receipt is recorded as reverted', async () => {
  const uncertain = await createBroadcastHarness({ sendError: true });
  assert.equal((await uncertain.broadcast()).state, 'confirmed'); assert.equal(uncertain.calls('controlled-send').length, 1);
  assert.deepEqual(uncertain.state.evidence.map(item => item.state), ['validated-not-sent', 'send-uncertain', 'confirmed']);
  const reverted = await createBroadcastHarness({ receipt: { status: 'reverted' } }); const result = await reverted.broadcast();
  assert.equal(result.state, 'reverted'); assert.equal(result.fillVerified, false);
  assert.equal(reverted.state.evidence.at(-1).receipt.status, 'reverted'); assert.equal(reverted.calls('controlled-send').length, 1);
});

test('noncanonical and foreign receipts cannot become confirmed evidence', async () => {
  for (const options of [{ canonicalHash: order.hash }, { receipt: { from: capture.system.marginBank } },
    { receipt: { to: capture.system.marginBank } }, { receipt: { transactionHash: order.hash } }, { receipt: { status: 'unknown' } }]) {
    const h = await createBroadcastHarness(options);
    await assert.rejects(h.broadcast(), /canonical|mismatch|Unknown receipt status/);
    assert.ok(!h.state.evidence.some(item => item.state === 'confirmed')); assert.equal(h.calls('controlled-send').length, 1);
  }
});
