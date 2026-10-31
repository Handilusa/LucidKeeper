import test from 'node:test';
import assert from 'node:assert/strict';
import { fundingState } from '../src/lib/data/fundingState.ts';

const empty = { gas: 0n, wallet: 0n, deposited: 0n, margin: 0, hasPositions: false };

test('known zero gas, wallet and margin is a normal read-only funding state', () => {
  assert.deepEqual(fundingState(empty), { missingGas: true, missingCollateral: true, notice: 'Read-only — STT and USDso collateral needed' });
});

test('gas and collateral deficiencies are named independently', () => {
  assert.equal(fundingState({ ...empty, gas: 1n }).notice, 'Read-only — USDso collateral needed');
  assert.equal(fundingState({ ...empty, wallet: 1n }).notice, 'Read-only — STT needed for gas');
});

test('unavailable or failed reads must not imply absent collateral', () => {
  for (const patch of [{ wallet: undefined }, { deposited: undefined }, { margin: null }, { hasPositions: undefined }]) {
    assert.equal(fundingState({ ...empty, gas: 1n, ...patch }).notice, null);
  }
  assert.equal(fundingState({ ...empty, gas: undefined }).missingGas, false);
});

test('zero wallet balance never hides deposited or locked collateral and existing positions', () => {
  for (const patch of [{ deposited: 1n }, { margin: 1 }, { hasPositions: true }]) {
    assert.equal(fundingState({ ...empty, gas: 1n, ...patch }).missingCollateral, false);
  }
});

test('funded wallets remain supported without a default bounty signer', () => {
  assert.equal(fundingState({ ...empty, gas: 1n, wallet: 1n }).notice, null);
  assert.equal(fundingState({ ...empty, gas: 1n, deposited: 1n }).notice, null);
});
