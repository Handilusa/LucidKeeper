import assert from 'node:assert/strict';
import {
  encodeFunctionData, erc20Abi, getAddress, keccak256, maxUint256,
  parseTransaction, recoverTransactionAddress, serializeTransaction, zeroAddress,
} from 'viem';
import { marginBankWriteAbi, perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { BOUNTY_EOA } from './dreamdex.mjs';

// Previously verified Tokyo contracts; the initial funding scope is exactly 2 USDso.
export const MARGIN_BANK = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';
export const COLLATERAL = '0xed7993A74dAe1e6656B704A424DcD8711aAf4F72';
export const TEST_MARGIN_AMOUNT = 2n * 10n ** 18n;
const fields = ['chainId', 'from', 'to', 'value', 'data', 'nonce', 'gas', 'type', 'fees', 'description'];
const feeFields = ['maxFeePerGas', 'maxPriorityFeePerGas'];
// Public secp256k1 curve order, not signing material.
const curveOrder = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;
const sameHex = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();

function exactFields(object, expected, label) {
  assert(object && typeof object === 'object' && !Array.isArray(object), `${label} must be an object`);
  assert.deepEqual(Object.keys(object).sort(), [...expected].sort(), `${label} has missing or extra fields`);
}

function decimal(value, label, { zero = false, max = maxUint256 } = {}) {
  assert(typeof value === 'string' && /^(0|[1-9][0-9]*)$/.test(value), `${label} must be a canonical decimal string`);
  const n = BigInt(value);
  assert(n >= (zero ? 0n : 1n) && n <= max, `${label} is out of range`);
  return n;
}

function address(value, label) {
  assert(typeof value === 'string' && /^0x[\da-fA-F]{40}$/.test(value), `${label} must be an address`);
  return getAddress(value.toLowerCase());
}

// Pure validation: an intent binds amounts/parameters independently of returned calldata.
// Pool membership is rechecked against the official bank's factory before broadcast.
export function validateUnsignedEnvelope(envelope, intent) {
  exactFields(envelope, fields, 'Envelope');
  assert.equal(envelope.chainId, 50383, 'Only Tokyo chainId 50383 is allowed');
  assert.equal(envelope.from, BOUNTY_EOA, 'Only the authorized bounty EOA is allowed');
  const to = address(envelope.to, 'to');
  assert.equal(envelope.type, 'eip1559', 'Only EIP-1559 is allowed');
  assert.equal(envelope.value, '0', 'Unexpected native value');
  assert(typeof envelope.data === 'string' && /^0x[\da-fA-F]{8}([\da-fA-F]{2})*$/.test(envelope.data), 'Invalid calldata');
  assert(Number.isSafeInteger(envelope.nonce) && envelope.nonce >= 0, 'Invalid nonce');
  decimal(envelope.gas, 'gas');
  exactFields(envelope.fees, feeFields, 'fees');
  const fee = decimal(envelope.fees.maxFeePerGas, 'maxFeePerGas');
  const tip = decimal(envelope.fees.maxPriorityFeePerGas, 'maxPriorityFeePerGas', { zero: true });
  assert(fee >= tip, 'Priority fee exceeds max fee');
  assert(typeof envelope.description === 'string' && envelope.description.trim().length > 0, 'Description is required');

  let expected;
  if (intent?.action === 'approve' || intent?.action === 'deposit') {
    exactFields(intent, ['action', 'amount'], 'Funding intent');
    const amount = decimal(intent.amount, 'amount');
    assert.equal(amount, TEST_MARGIN_AMOUNT, 'Initial funding allowlist requires exactly 2 USDso');
    assert.equal(to, intent.action === 'approve' ? COLLATERAL : MARGIN_BANK, 'Destination is outside the allowlist');
    expected = intent.action === 'approve'
      ? encodeFunctionData({ abi: erc20Abi, functionName: 'approve', args: [MARGIN_BANK, amount] })
      : encodeFunctionData({ abi: marginBankWriteAbi, functionName: 'deposit', args: [amount] });
  } else if (intent?.action === 'order') {
    exactFields(intent, ['action', 'pool', 'isBid', 'price', 'quantity', 'expireTimestampNs'], 'Order intent');
    assert.equal(to, address(intent.pool, 'pool'), 'Order pool differs from review');
    assert(![zeroAddress, MARGIN_BANK, COLLATERAL, BOUNTY_EOA].includes(to), 'Invalid order pool');
    assert.equal(typeof intent.isBid, 'boolean', 'Invalid order side');
    const price = decimal(intent.price, 'price', { max: (1n << 128n) - 1n });
    const quantity = decimal(intent.quantity, 'quantity', { max: (1n << 128n) - 1n });
    const expiry = decimal(intent.expireTimestampNs, 'expireTimestampNs', { max: (1n << 64n) - 1n });
    expected = encodeFunctionData({
      abi: perpPoolWriteAbi, functionName: 'placeOrder',
      args: [intent.isBid, 0n, price, quantity, expiry, 2, 0, zeroAddress, 0n],
    });
  } else {
    assert.fail('Action is outside the bounty allowlist');
  }
  // Full canonical encoding also rejects wrong selectors, spenders, amounts, fees,
  // trailing bytes, alternate methods and hidden extra order parameters.
  assert(sameHex(envelope.data, expected), 'Calldata differs from the exact allowlisted intent');
  return intent.action;
}

// In-memory only: no RPC, files, nonces or fee guesses. Live preparation CLIs stay held.
export function buildUnsignedEnvelope({ call, nonce, gas, fees, description }, intent) {
  for (const [name, value] of Object.entries({ gas, ...fees })) {
    assert.equal(typeof value, 'bigint', `${name} must be a bigint`);
  }
  assert.equal(typeof call.value, 'bigint', 'value must be a bigint');
  const envelope = {
    chainId: call.chainId, from: call.from, to: call.to, value: call.value.toString(),
    data: call.data, nonce, gas: gas.toString(), type: 'eip1559',
    fees: Object.fromEntries(Object.entries(fees).map(([key, value]) => [key, value.toString()])),
    description,
  };
  validateUnsignedEnvelope(envelope, intent);
  Object.freeze(envelope.fees);
  return Object.freeze(envelope);
}

export function envelopeTransaction(envelope) {
  return {
    chainId: envelope.chainId, type: envelope.type, to: envelope.to, data: envelope.data,
    value: BigInt(envelope.value), nonce: envelope.nonce, gas: BigInt(envelope.gas),
    maxFeePerGas: BigInt(envelope.fees.maxFeePerGas),
    maxPriorityFeePerGas: BigInt(envelope.fees.maxPriorityFeePerGas),
  };
}

export async function validateSignedTransaction(raw, reviewedEnvelope, reviewedIntent) {
  // Snapshot caller input before any asynchronous recovery.
  const envelope = structuredClone(reviewedEnvelope);
  const intent = structuredClone(reviewedIntent);
  const action = validateUnsignedEnvelope(envelope, intent);
  assert(typeof raw === 'string' && /^0x02([\da-fA-F]{2})+$/.test(raw) && raw.length <= 8192, 'Expected a signed EIP-1559 raw transaction');
  let tx;
  try {
    tx = parseTransaction(raw);
  } catch {
    throw new Error('Malformed raw transaction'); // Never echo a raw payload through parser errors.
  }
  assert(tx.r && tx.s && [0, 1].includes(tx.yParity), 'Raw transaction must contain a signature');
  assert(BigInt(tx.r) > 0n && BigInt(tx.r) < curveOrder && BigInt(tx.s) > 0n && BigInt(tx.s) <= curveOrder / 2n, 'Invalid or noncanonical signature');
  assert(!tx.accessList?.length, 'Unreviewed access list');
  assert(sameHex(serializeTransaction(tx), raw), 'Noncanonical raw encoding');
  const expected = envelopeTransaction(envelope);
  for (const name of ['chainId', 'type', 'nonce', 'gas', 'maxFeePerGas', 'maxPriorityFeePerGas', 'value']) {
    const actual = ['value', 'maxPriorityFeePerGas'].includes(name) ? (tx[name] ?? 0n) : tx[name];
    assert.equal(actual, expected[name], `Signed ${name} differs from reviewed envelope`);
  }
  for (const name of ['to', 'data']) assert(sameHex(tx[name], expected[name]), `Signed ${name} differs from reviewed envelope`);
  let from;
  try {
    from = await recoverTransactionAddress({ serializedTransaction: raw });
  } catch {
    throw new Error('Cannot recover signed transaction sender');
  }
  assert(sameHex(from, BOUNTY_EOA), 'Recovered sender is not the authorized bounty EOA');
  return Object.freeze({ hash: keccak256(raw), from: BOUNTY_EOA, action });
}
