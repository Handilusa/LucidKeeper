import test from 'node:test';
import assert from 'node:assert/strict';
import { windowReturn, scopedProfileRows, ownsProfileRow, participatesInFill } from '../src/lib/data/profileMetrics.ts';
import { observedAccounts, observeAccount, clearObservedAccounts } from '../src/lib/data/observedAccounts.ts';

const usd = value => BigInt(value) * 10n ** 18n;
const flow = (id, timestamp, amount, blockNumber = BigInt(timestamp), logIndex = 0) => ({ id, timestamp, amount, blockNumber, logIndex });
const window = { start: 100, end: 200, startingValue: usd(200), endingValue: usd(280), completeCashFlows: true, verifiedBoundaryValues: true, cashFlows: [flow('deposit', 120, usd(100)), flow('withdraw', 140, usd(-50))] };
test('window ROI uses equity delta minus net inflow and maximum cumulative deposits', () => {
  const result = windowReturn(window);
  assert.equal(result.pnl, usd(30)); assert.equal(result.maxNetDeposits, usd(100));
  assert.equal(result.denominator, usd(300)); assert.equal(result.value, 0.1);
});
test('100 USDso denominator floor, negative PnL and withdrawal-first cash flows', () => {
  assert.equal(windowReturn({ ...window, startingValue: usd(10), endingValue: usd(20), cashFlows: [] }).value, 0.1);
  const result = windowReturn({ ...window, endingValue: usd(190), cashFlows: [flow('withdraw-first', 101, usd(-20)), flow('deposit', 120, usd(10))] });
  assert.equal(result.maxNetDeposits, 0n); assert.equal(result.value, 0);
  assert.equal(windowReturn({ ...window, endingValue: usd(180), cashFlows: [] }).value, -0.1);
});
test('missing boundaries, incomplete or duplicate flows and invalid windows have no ROI', () => {
  for (const change of [{ startingValue: null }, { endingValue: null }, { completeCashFlows: false }, { verifiedBoundaryValues: false }, { end: 100 }, { cashFlows: [window.cashFlows[0], window.cashFlows[0]] }]) assert.equal(windowReturn({ ...window, ...change }).value, null);
  assert.equal(windowReturn({ ...window, cashFlows: [flow('outside', 200, usd(999))] }).netDeposits, 0n);
});
test('same-second cash flows require chain order, not response order', () => {
  const result = windowReturn({ ...window, cashFlows: [flow('withdraw', 120, usd(-100), 10n, 1), flow('deposit', 120, usd(100), 10n, 0)] });
  assert.equal(result.maxNetDeposits, usd(100));
  assert.equal(windowReturn({ ...window, cashFlows: [flow('x', 120, 1n, 10n, 0), flow('y', 120, 1n, 10n, 0)] }).value, null);
  assert.equal(windowReturn({ ...window, cashFlows: [flow('x', NaN, 1n, 10n, 0)] }).value, null);
});
test('profile event scope enforces address, Tokyo, verified pool, window and deduplication', () => {
  const row = { id: 'one', account: 'alice', timestamp: '120', pool: 'pool', chainId: 50383 };
  const rows = [row, row, { ...row, id: 'foreign', account: 'bob' }, { ...row, id: 'outside', timestamp: '200' }, { ...row, id: 'badpool', pool: 'unknown' }, { ...row, id: 'network', chainId: 1 }];
  assert.deepEqual(scopedProfileRows(rows, 'ALICE', 100, 200, ['POOL'], ownsProfileRow), [row]);
  assert.equal(scopedProfileRows([{ ...row, maker: 'alice', taker: 'bob' }], 'alice', 100, 200, ['pool'], participatesInFill).length, 1);
});
test('browser-observed cohort is normalized, deduplicated, capped and never seeded', () => {
  const data = new Map(); const storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
  assert.deepEqual(observedAccounts(storage), []);
  observeAccount(storage, 'invalid'); assert.deepEqual(observedAccounts(storage), []);
  for (let i = 1; i <= 8; i++) observeAccount(storage, `0x${i.toString(16).padStart(40, '0')}`);
  assert.equal(observedAccounts(storage).length, 5);
  observeAccount(storage, observedAccounts(storage)[0].toUpperCase().replace('0X', '0x'));
  assert.equal(observedAccounts(storage).length, 5);
  clearObservedAccounts(storage); assert.deepEqual(observedAccounts(storage), []);
});
