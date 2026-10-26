import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeFunctionData, erc20Abi } from 'viem';
import { marginBankWriteAbi } from '@somnia-chain/markets-sdk';
import { BOUNTY_EOA, bountyAddress, exactUnits } from '../src/lib/dreamdex.mjs';
import { buildUnsignedMarginDeposit } from '../src/lib/funding.mjs';

const bank = '0x2222222222222222222222222222222222222222';
const token = '0x3333333333333333333333333333333333333333';
const amount = 2n * 10n ** 18n;
const input = { address: BOUNTY_EOA, system: { marginBank: bank, collateralToken: token }, amount, allowance: 0n, balance: 200n * 10n ** 18n };

test('transaction preparation excludes other accounts, including the prohibited smart wallet', () => {
  assert.equal(bountyAddress(BOUNTY_EOA.toLowerCase()), BOUNTY_EOA);
  for (const address of [bank, '0x6DbDB8A34d6Eab91be2d8C733A86428a1c9F45F4']) {
    assert.throws(() => buildUnsignedMarginDeposit({ ...input, address }), /authorized bounty EOA/);
  }
});

test('margin calls approve only the exact amount to the bank and deposit for the EOA', () => {
  const { approval, deposit } = buildUnsignedMarginDeposit(input);
  assert.equal(approval.from, BOUNTY_EOA);
  assert.equal(approval.to, token);
  assert.equal(approval.chainId, 50383);
  assert.equal(approval.value, 0n);
  const approved = decodeFunctionData({ abi: erc20Abi, data: approval.data });
  assert.equal(approved.functionName, 'approve');
  assert.deepEqual(approved.args, [bank, amount]);
  assert.equal(deposit.from, BOUNTY_EOA);
  assert.equal(deposit.to, bank);
  assert.equal(deposit.value, 0n);
  const deposited = decodeFunctionData({ abi: marginBankWriteAbi, data: deposit.data });
  assert.equal(deposited.functionName, 'deposit');
  assert.deepEqual(deposited.args, [amount]);
});

test('sufficient existing allowance omits an additional approval', () => {
  for (const allowance of [amount, amount + 1n]) {
    assert.equal(buildUnsignedMarginDeposit({ ...input, allowance }).approval, null);
  }
  assert.ok(buildUnsignedMarginDeposit({ ...input, allowance: amount - 1n }).approval);
});

test('unfunded, zero and imprecise deposits cannot produce a transaction', () => {
  assert.throws(() => buildUnsignedMarginDeposit({ ...input, balance: amount - 1n }), /Insufficient wallet/);
  for (const bad of [0n, -1n, 2]) assert.throws(() => buildUnsignedMarginDeposit({ ...input, amount: bad }));
  for (const bad of ['0', '-2', '2e0', '2.0000000000000000001', undefined]) {
    assert.throws(() => exactUnits(bad, 18, 'Deposit'));
  }
});
