import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildUnsignedMarginDeposit } from '../src/lib/funding.mjs';
import { capture, amount } from './fixtures/captured.mjs';
const input = { address: capture.account.address, system: capture.system, amount, allowance: BigInt(capture.account.allowance), balance: BigInt(capture.account.walletCollateral) };
test('transaction preparation excludes other accounts, including the prohibited smart wallet', () => {
  assert.throws(() => buildUnsignedMarginDeposit({ ...input, address: capture.system.marginBank }));
});
test('margin calls approve only the exact amount to the bank and deposit for the EOA', () => {
  // Pure historical calldata reconstruction, not live preparation.
  const result = buildUnsignedMarginDeposit(input);
  assert.equal(result.approval.data, capture.execution[0].transaction.input);
  assert.equal(result.deposit.data, capture.execution[1].transaction.input);
});
test('sufficient existing allowance omits an additional approval', () => {
  // Approval amount decoded from the actual successful receipt transaction.
  assert.equal(buildUnsignedMarginDeposit({ ...input, allowance: amount }).approval, null);
});
test('unfunded, zero and imprecise deposits cannot produce a transaction', () => {
  // Explicit invalid input mutations, never passed off as public financial responses.
  assert.throws(() => buildUnsignedMarginDeposit({ ...input, balance: -1n }));
  assert.throws(() => buildUnsignedMarginDeposit({ ...input, amount: 0n }));
});
