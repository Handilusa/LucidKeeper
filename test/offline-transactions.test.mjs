import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { encodeFunctionData, erc20Abi, maxUint256 } from 'viem';
import { buildUnsignedEnvelope, validateUnsignedEnvelope, TEST_MARGIN_AMOUNT } from '../src/lib/offline-transactions.mjs';
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
test('zero nonce/priority fee work without silently defaulting missing fields', { skip: 'No captured allowlisted transaction with zero priority fee; do not fabricate a wire fixture.' }, () => {});
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
for (const title of [
  'signed raw rejects changes to all reviewed transaction fields before recovery',
  'unsigned, malformed, non-EIP1559 and invalid signature inputs fail closed',
  'real cryptographic recovery never treats synthetic signature fields as the EOA',
  'production broadcast validates input when hold is released',
]) test(title, { skip: 'Synthetic signature/HOLD-release scenario removed; real sender and mismatch checks run in dreamdex.test.mjs. Tests never broadcast live transactions.' }, () => {});
