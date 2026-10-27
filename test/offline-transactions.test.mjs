import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { encodeFunctionData, erc20Abi, maxUint256, serializeTransaction, toHex } from 'viem';
import { BOUNTY_EOA, buildUnsignedOrder } from '../src/lib/dreamdex.mjs';
import {
  buildUnsignedEnvelope, validateUnsignedEnvelope, validateSignedTransaction, envelopeTransaction,
  COLLATERAL, MARGIN_BANK, TEST_MARGIN_AMOUNT,
} from '../src/lib/offline-transactions.mjs';
import { broadcastSignedTransaction } from '../src/lib/broadcast.mjs';

// Synthetic, in-memory wire data only. No signer, signing operation or evidence file.
const other = '0x1111111111111111111111111111111111111111';
const intent = { action: 'approve', amount: TEST_MARGIN_AMOUNT.toString() };
const call = {
  chainId: 50383, from: BOUNTY_EOA, to: COLLATERAL, value: 0n,
  data: encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [MARGIN_BANK, TEST_MARGIN_AMOUNT] }),
};
const input = { call, nonce: 7, gas: 100_000n, fees: { maxFeePerGas: 10n, maxPriorityFeePerGas: 1n }, description: 'Approve exactly 2 USDso for the official MarginBank.' };
const envelope = buildUnsignedEnvelope(input, intent);
const signatureFields = { r: toHex(1n, { size: 32 }), s: toHex(1n, { size: 32 }), yParity: 0 };
const raw = (changes = {}, signature = signatureFields) => serializeTransaction({ ...envelopeTransaction(envelope), ...changes }, signature);

test('envelope serializes losslessly with all handoff-schema fields', () => {
  const schema = JSON.parse(readFileSync(new URL('../docs/unsigned-transaction.schema.json', import.meta.url)));
  assert.deepEqual(Object.keys(envelope).sort(), schema.required.sort());
  assert.deepEqual(JSON.parse(JSON.stringify(envelope)), envelope);
  assert.equal(envelope.nonce, 7);
  assert.equal(envelope.gas, '100000');
  assert.deepEqual(envelope.fees, { maxFeePerGas: '10', maxPriorityFeePerGas: '1' });
  assert.equal(validateUnsignedEnvelope(envelope, intent), 'approve');
  assert(Object.isFrozen(envelope) && Object.isFrozen(envelope.fees));
});

test('schema boundary rejects missing/extra fields and malformed numeric input', () => {
  for (const key of Object.keys(envelope)) {
    const broken = structuredClone(envelope);
    delete broken[key];
    assert.throws(() => validateUnsignedEnvelope(broken, intent));
  }
  for (const change of [
    { chainId: 50312 }, { from: other }, { value: '1' }, { type: 'legacy' },
    { nonce: -1 }, { nonce: 0.5 }, { nonce: Number.MAX_SAFE_INTEGER + 1 },
    { gas: '0' }, { gas: '01' }, { gas: '-1' }, { gas: '1e5' }, { gas: (maxUint256 + 1n).toString() },
    { description: '' }, { description: ' ' }, { to: '0x1234' }, { data: '0x123' },
    { accessList: [] }, { fees: { ...envelope.fees, gasPrice: '1' } },
    { fees: { maxFeePerGas: '1', maxPriorityFeePerGas: '2' } },
    { fees: { maxFeePerGas: '0', maxPriorityFeePerGas: '0' } },
  ]) assert.throws(() => validateUnsignedEnvelope({ ...envelope, ...change }, intent));
  assert.throws(() => buildUnsignedEnvelope({ ...input, gas: 100000 }, intent), /bigint/);
  assert.throws(() => buildUnsignedEnvelope({ ...input, call: { ...call, value: 0 } }, intent), /bigint/);
});

test('zero nonce/priority fee work without silently defaulting missing fields', () => {
  const zero = buildUnsignedEnvelope({ ...input, nonce: 0, fees: { maxFeePerGas: 1n, maxPriorityFeePerGas: 0n } }, intent);
  assert.equal(zero.nonce, 0);
  assert.equal(zero.fees.maxPriorityFeePerGas, '0');
  assert.throws(() => buildUnsignedEnvelope({ ...input, fees: { maxFeePerGas: 1n } }, intent));
});

test('allowlist binds exact funding selector, destination, spender and amount', () => {
  for (const args of [[other, TEST_MARGIN_AMOUNT], [MARGIN_BANK, 0n], [MARGIN_BANK, 1n], [MARGIN_BANK, maxUint256]]) {
    const data = encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args });
    assert.throws(() => validateUnsignedEnvelope({ ...envelope, data }, intent), /Calldata/);
  }
  for (const to of [other, MARGIN_BANK]) assert.throws(() => validateUnsignedEnvelope({ ...envelope, to }, intent), /Destination/);
  const transfer = encodeFunctionData({ abi: erc20Abi, functionName: 'transfer', args: [MARGIN_BANK, TEST_MARGIN_AMOUNT] });
  for (const data of [transfer, envelope.data + '00', '0xdeadbeef']) {
    assert.throws(() => validateUnsignedEnvelope({ ...envelope, data }, intent), /Calldata/);
  }
  assert.throws(() => validateUnsignedEnvelope(envelope, { action: 'transfer', amount: intent.amount }), /allowlist/);
  assert.throws(() => validateUnsignedEnvelope(envelope, { ...intent, amount: '1' }), /exactly 2/);
});

test('order review binds every IOC field and rejects extra builder fees or changed sizing', () => {
  const params = { pool: other, isBid: true, price: 80000n * 10n ** 18n, quantity: 13000n, orderType: 2 };
  const order = buildUnsignedOrder(params, 1000n);
  const review = { action: 'order', pool: other, isBid: true, price: params.price.toString(), quantity: '13000', expireTimestampNs: order.expireTimestampNs.toString() };
  const unsigned = buildUnsignedEnvelope({ ...input, call: { ...order, from: BOUNTY_EOA } }, review);
  assert.equal(validateUnsignedEnvelope(unsigned, review), 'order');
  for (const change of [{ quantity: '14000' }, { price: '1' }, { isBid: false }, { expireTimestampNs: '1' }, { pool: COLLATERAL }]) {
    assert.throws(() => validateUnsignedEnvelope(unsigned, { ...review, ...change }));
  }
  const changedType = buildUnsignedOrder({ ...params, orderType: 1 }, 1000n);
  assert.throws(() => validateUnsignedEnvelope({ ...unsigned, data: changedType.data }, review), /Calldata/);
});

test('signed raw rejects changes to all reviewed transaction fields before recovery', async () => {
  for (const [field, value] of Object.entries({
    chainId: 50312, nonce: 8, gas: 100001n, maxFeePerGas: 11n, maxPriorityFeePerGas: 2n,
    value: 1n, to: other, data: envelope.data + '00',
  })) await assert.rejects(validateSignedTransaction(raw({ [field]: value }), envelope, intent), new RegExp(`Signed ${field}`));
  const accessList = [{ address: other, storageKeys: [] }];
  await assert.rejects(validateSignedTransaction(raw({ accessList }), envelope, intent), /access list/);
});

test('unsigned, malformed, non-EIP1559 and invalid signature inputs fail closed', async () => {
  for (const bad of [undefined, '', '0x02', '0x02ff', '0x0100', serializeTransaction(envelopeTransaction(envelope))]) {
    await assert.rejects(validateSignedTransaction(bad, envelope, intent));
  }
  await assert.rejects(validateSignedTransaction(raw({}, { ...signatureFields, r: toHex(0n, { size: 32 }) }), envelope, intent), /signature/);
  await assert.rejects(validateSignedTransaction(raw({}, { ...signatureFields, s: toHex(maxUint256, { size: 32 }) }), envelope, intent), /signature/);
});

test('real cryptographic recovery never treats synthetic signature fields as the EOA', async () => {
  await assert.rejects(validateSignedTransaction(raw(), envelope, intent), /Recovered sender|Cannot recover/);
});

test('production broadcast validates input when hold is released', async () => {
  // With HOLD released, broadcast proceeds to input validation.
  await assert.rejects(broadcastSignedTransaction(undefined));
  await assert.rejects(broadcastSignedTransaction({}), /Envelope|object|Expected/i);
});
