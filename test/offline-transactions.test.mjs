import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { encodeFunctionData, erc20Abi, maxUint256, serializeTransaction, recoverTransactionAddress, toHex } from 'viem';
import { buildUnsignedEnvelope, validateUnsignedEnvelope, validateSignedTransaction, envelopeTransaction, TEST_MARGIN_AMOUNT } from '../src/lib/offline-transactions.mjs';
import { broadcastSignedTransaction } from '../src/lib/broadcast.mjs';
import { adversarialWire, createWireBoundary, curveOrder } from './helpers/wire-boundary.mjs';
import { approval, order, decodedOrder, amount, historicalEnvelope, capture } from './fixtures/captured.mjs';
const envelope = historicalEnvelope();
const intent = { action: 'approve', amount: amount.toString() };
test('envelope serializes losslessly with all handoff-schema fields', () => {
  const schema = JSON.parse(readFileSync(new URL('../docs/unsigned-transaction.schema.json', import.meta.url)));
  assert.deepEqual(Object.keys(envelope).sort(), schema.required.sort());
  assert.deepEqual(JSON.parse(JSON.stringify(envelope)), envelope);
  assert.equal(validateUnsignedEnvelope(envelope, intent), 'approve');
  const tx = approval.transaction;
   assert.deepEqual(buildUnsignedEnvelope({ call: { chainId: tx.chainId, from: envelope.from, to: envelope.to, value: BigInt(tx.value), data: tx.input }, nonce: tx.nonce, gas: BigInt(tx.gas), fees: { maxFeePerGas: BigInt(tx.maxFeePerGas), maxPriorityFeePerGas: BigInt(tx.maxPriorityFeePerGas) }, description: envelope.description }, intent), envelope);
});
test('schema boundary rejects missing/extra fields and malformed numeric input', () => {
  // Adversarial input mutations, not invented successful RPC/financial responses.
  for (const key of Object.keys(envelope)) {
    const broken = structuredClone(envelope); delete broken[key];
    assert.throws(() => validateUnsignedEnvelope(broken, intent));
  }
  for (const change of [{ nonce: -1 }, { gas: 'NaN' }, { value: '-1' }, { description: '' }, { accessList: [] }])
    assert.throws(() => validateUnsignedEnvelope({ ...envelope, ...change }, intent));
});
test('zero nonce/priority fee work without silently defaulting missing fields (test-only envelope)', () => {
  const zero = { ...envelope, nonce: 0, fees: { ...envelope.fees, maxPriorityFeePerGas: '0' } };
  assert.equal(validateUnsignedEnvelope(zero, intent), 'approve');
  const missing = structuredClone(zero); delete missing.fees.maxPriorityFeePerGas;
  assert.throws(() => validateUnsignedEnvelope(missing, intent));
});
test('allowlist binds exact funding selector, destination, spender and amount', () => {
  assert.equal(amount, TEST_MARGIN_AMOUNT);
  for (const record of [approval, capture.execution[1]]) {
    const review = historicalEnvelope(record);
    const funding = { action: record === approval ? 'approve' : 'deposit', amount: amount.toString() };
    assert.equal(validateUnsignedEnvelope(review, funding), funding.action);
    for (const changedAmount of [amount - 1n, amount + 1n, maxUint256])
      assert.throws(() => validateUnsignedEnvelope(review, { ...funding, amount: changedAmount.toString() }), /exactly 2 USDso/);
    assert.throws(() => validateUnsignedEnvelope({ ...review, to: order.transaction.to }, funding), /Destination is outside/);
  }
  // Malicious calldata boundary inputs, never approvals sent to any contract.
  for (const args of [[capture.system.marginBank, maxUint256], [capture.system.collateralToken, amount]])
    assert.throws(() => validateUnsignedEnvelope({ ...envelope, data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args }) }, intent), /Calldata differs/);
  assert.throws(() => validateUnsignedEnvelope({ ...envelope, to: capture.system.marginBank }, intent));
  assert.throws(() => validateUnsignedEnvelope({ ...envelope, data: envelope.data + '00' }, intent));
  assert.throws(() => validateUnsignedEnvelope(envelope, { action: 'transfer', amount: intent.amount }));
});
test('order review binds every IOC field and rejects extra builder fees or changed sizing', () => {
  const review = { action: 'order', pool: order.transaction.to, isBid: decodedOrder.args[0], price: decodedOrder.args[2].toString(), quantity: decodedOrder.args[3].toString(), expireTimestampNs: decodedOrder.args[4].toString() };
  const historical = historicalEnvelope(order);
  assert.equal(validateUnsignedEnvelope(historical, review), 'order');
  for (const change of [{ quantity: String(decodedOrder.args[3] + 1n) }, { isBid: !review.isBid }, { pool: approval.transaction.to }])
    assert.throws(() => validateUnsignedEnvelope(historical, { ...review, ...change }));
});
test('signed-wire boundary rejects changes to every reviewed transaction field before recovery', async () => {
  const boundary = await createWireBoundary();
  const raw = adversarialWire();
  const changes = [
    [{ chainId: 1 }, /Only Tokyo/], [{ from: capture.system.marginBank }, /authorized bounty EOA/],
    [{ to: capture.system.marginBank }, /Destination is outside/], [{ value: '1' }, /Unexpected native value/],
    [{ data: envelope.data + '00' }, /Calldata differs/], [{ nonce: envelope.nonce + 1 }, /Signed nonce/],
    [{ gas: String(BigInt(envelope.gas) + 1n) }, /Signed gas/], [{ type: 'legacy' }, /Only EIP-1559/],
    [{ fees: { ...envelope.fees, maxFeePerGas: String(BigInt(envelope.fees.maxFeePerGas) + 1n) } }, /Signed maxFeePerGas/],
    [{ fees: { ...envelope.fees, maxPriorityFeePerGas: String(BigInt(envelope.fees.maxPriorityFeePerGas) + 1n) } }, /Signed maxPriorityFeePerGas/],
  ];
  for (const [change, reason] of changes)
    await assert.rejects(boundary.validateSignedTransaction(raw, { ...envelope, ...change }, intent), reason);
  // Also mutate the returned wire independently of a still-valid review.
  for (const [change, reason] of [[{ chainId: 1 }, /Signed chainId/], [{ to: capture.system.marginBank }, /Signed to/],
    [{ value: 1n }, /Signed value/], [{ data: envelope.data + '00' }, /Signed data/]])
    await assert.rejects(boundary.validateSignedTransaction(adversarialWire(change), envelope, intent), reason);
  assert.equal(boundary.recoveries.length, 0);
});

test('unsigned, malformed, non-EIP1559 and invalid signature inputs fail closed', async () => {
  const boundary = await createWireBoundary();
  const raw = adversarialWire();
  const unsigned = serializeTransaction(envelopeTransaction(envelope));
  const { maxFeePerGas, maxPriorityFeePerGas: _tip, ...non1559 } = envelopeTransaction(envelope);
  const legacy = serializeTransaction({ ...non1559, type: 'legacy', gasPrice: maxFeePerGas });
  const eip2930 = serializeTransaction({ ...non1559, type: 'eip2930', gasPrice: maxFeePerGas, accessList: [] });
  for (const bad of ['', '0x', '0x01', '0x02ff', unsigned, legacy, eip2930, raw.slice(0, -2), raw + '00', '0x02' + 'ff'.repeat(4096)])
    await assert.rejects(boundary.validateSignedTransaction(bad, envelope, intent));
  for (const scalars of [{ r: toHex(curveOrder, { size: 32 }) }, { s: toHex(curveOrder / 2n + 1n, { size: 32 }) }])
    await assert.rejects(boundary.validateSignedTransaction(adversarialWire({}, scalars), envelope, intent), /Invalid or noncanonical signature/);
  await assert.rejects(boundary.validateSignedTransaction(adversarialWire({ accessList: [{ address: capture.system.marginBank, storageKeys: [] }] }), envelope, intent), /Unreviewed access list/);
  assert.equal(boundary.recoveries.length, 0);
});

test('real cryptographic recovery never treats adversarial signature fields as the EOA', async () => {
  const raw = adversarialWire();
  const recovered = await recoverTransactionAddress({ serializedTransaction: raw });
  assert.notEqual(recovered.toLowerCase(), capture.account.address.toLowerCase());
  await assert.rejects(validateSignedTransaction(raw, envelope, intent), /Recovered sender is not the authorized bounty EOA/);
});

test('production broadcast validates malformed input under the wallet-scoped release', async () => {
  // Actual imports and policy, no substituted recovery or transport. The invalid
  // input must fail before client creation, evidence writing or any send.
  await assert.rejects(broadcastSignedTransaction({ raw: 'not-a-raw', envelope, intent, expiresAt: 0 }), /Expected a signed EIP-1559/);
});
