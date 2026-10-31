import assert from 'node:assert/strict';
import { test } from 'node:test';
import { serializeTransaction, parseTransaction } from 'viem';
import { walletAddress, orderParams, receiptEvidence } from '../src/lib/dreamdex.mjs';
import { envelopeTransaction } from '../src/lib/offline-transactions.mjs';
import { createDreamdexHarness } from './helpers/dreamdex-harness.mjs';
import { createWireBoundary, adversarialWire } from './helpers/wire-boundary.mjs';
import { capture, btc, bigintGrid, orderInput, approval, amount, historicalEnvelope } from './fixtures/captured.mjs';
test('offline network verification matches captured Tokyo genesis', async () => {
  const h = await createDreamdexHarness();
  const network = await h.verifyNetwork(h.rpc);
  assert.equal(network.chainId, capture.provenance.network.chainId);
  assert.equal(network.genesisHash, capture.provenance.network.genesisHash);
  assert.deepEqual(h.calls, [['chain'], ['block', { blockNumber: 0n }]]);
});
test('wallet boundary rejects absent, truncated and malformed addresses', () => {
  assert.equal(walletAddress(capture.account.address), capture.account.address);
  for (const bad of [undefined, '', '0x1234', 'not-an-address']) assert.throws(() => walletAddress(bad));
});
test('order uses separate quote/base scales with no Number conversion', () => {
  assert.equal(orderParams(btc.market, bigintGrid(btc), orderInput).quantity.toString(), capture.historicalPosition.size);
  for (const snapshot of capture.snapshots) {
    const price = String(BigInt(snapshot.grid.tickSize) * (BigInt(snapshot.mark[1]) / BigInt(snapshot.grid.tickSize)));
    assert.ok(BigInt(price) > 0n);
    assert.equal(BigInt(snapshot.oneBase), 10n ** BigInt(snapshot.market.baseDecimals));
  }
});
test('invalid size, excess precision, grid, side and zero never become orders', () => {
  for (const change of [{ quantity: '' }, { quantity: '-1' }, { quantity: 'NaN' }, { price: 'NaN' }, { side: 'long' }])
    assert.throws(() => orderParams(btc.market, bigintGrid(btc), { ...orderInput, ...change }));
});
test('historical IOC has the authorized chain and no native value', () => {
  assert.equal(capture.execution[2].transaction.value, '0');
  assert.equal(capture.execution[2].transaction.chainId, 50383);
});
test('real non-order receipt and foreign account are not order evidence', () => {
  // Real approval/deposit receipts have no order evidence; a real contract is not the owner.
  assert.throws(() => receiptEvidence(approval.receipt, btc.market, capture.account.address));
  assert.throws(() => receiptEvidence(capture.execution[2].receipt, btc.market, capture.system.marginBank));
});
test('separates account position events, pool fills, and absent PnL', () => {
  const result = receiptEvidence(capture.execution[2].receipt, btc.market, capture.account.address);
  assert.equal(result.poolFillObserved, true);
  assert.ok(result.accountOrderEvents.length > 0);
  assert.equal(result.accountPositionEvents[0].args.newSize.toString(), capture.historicalPosition.size);
  assert.equal(result.pnl, null);
});
test('controlled owned placement-only logs are not a fill or position', () => {
  // Remove fill/position logs from the reviewed IOC receipt. This tests event
  // classification, NOT the existence of a sourced real resting-only receipt.
  const source = receiptEvidence(capture.execution[2].receipt, btc.market, capture.account.address);
  assert.ok(source.accountOrderEvents.length > 0);
  const controlled = { ...capture.execution[2].receipt, logs: source.accountOrderEvents };
  const result = receiptEvidence(controlled, btc.market, capture.account.address);
  assert.equal(result.transactionConfirmed, true);
  assert.equal(result.accountOrderEvents.length, source.accountOrderEvents.length);
  assert.equal(result.accountPositionEvents.length, 0); assert.equal(result.poolFillEvents.length, 0);
  assert.equal(result.poolFillObserved, false); assert.equal(result.pnl, null);
  assert.throws(() => receiptEvidence(controlled, btc.market, capture.system.marginBank), /No placement or position event/);
  assert.throws(() => receiptEvidence({ ...controlled, status: 'reverted' }, btc.market, capture.account.address), /Transaction reverted/);
});
test('captured unsigned fields round-trip and an exact controlled wire reaches recovery', async () => {
  const envelope = historicalEnvelope();
  const unsigned = serializeTransaction(envelopeTransaction(envelope));
  assert.equal(serializeTransaction(parseTransaction(unsigned)), unsigned);
  const intent = { action: 'approve', amount: amount.toString() };
  const boundary = await createWireBoundary();
  // Recovery boundary deliberately rejects: reaching it proves all preceding
  // canonical-wire comparisons passed, not that a synthetic input is authorized.
  await assert.rejects(boundary.validateSignedTransaction(adversarialWire(), { ...envelope, description: 'Historical metadata only' }, intent), /Cannot recover signed transaction sender/);
  assert.equal(boundary.recoveries.length, 1);
});
test('verifiedMarket and readAccount use captured reads at one pinned block offline', async () => {
  const h = await createDreamdexHarness();
  const { exchange, rpc } = h.openTokyo();
  try {
    const result = await h.verifiedMarket(exchange, rpc, capture.snapshots.map(snapshot => snapshot.market), 'BTC');
    assert.equal(result.market.poolAddress.toLowerCase(), btc.market.poolAddress.toLowerCase());
    assert.deepEqual(result.grid, bigintGrid(btc)); assert.equal(result.blockNumber, h.blockNumber);
    const account = await h.readAccount(exchange, rpc, result.system, capture.account.address);
    assert.equal(account.address, capture.account.address);
    assert.equal(account.blockNumber, h.blockNumber); assert.equal(account.gas.toString(), capture.account.gas);
    assert.equal(account.walletCollateral.toString(), capture.account.walletCollateral);
    assert.equal(account.margin, h.margin); assert.equal(account.accountHasCode, false); assert.equal(account.voucher, null);
    for (const [name, args] of h.calls.filter(([name]) => ['read', 'balance', 'code'].includes(name))) {
      assert.equal(args.blockNumber, h.blockNumber, name);
      if (name !== 'read' || args.functionName === 'balanceOf') assert.equal(args.address, name === 'read' ? capture.system.collateralToken : capture.account.address);
    }
  } finally { await exchange.close(); }
});
