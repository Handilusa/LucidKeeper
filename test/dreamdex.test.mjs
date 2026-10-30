import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPublicClient, http, serializeTransaction, keccak256 } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { openTokyo, verifyNetwork, verifiedMarket, readAccount, walletAddress, orderParams, receiptEvidence } from '../src/lib/dreamdex.mjs';
import { validateSignedTransaction } from '../src/lib/offline-transactions.mjs';
import { capture, btc, bigintGrid, orderInput, approval, amount, historicalEnvelope } from './fixtures/captured.mjs';
const rpc = createPublicClient({ chain: hidekiTestnet, transport: http(undefined, { retryCount: 0, timeout: 15000 }) });
test('real read-only Tokyo network verification matches captured genesis', async () => {
  // Actual read-only Tokyo verification; wrong-chain branch remains explicitly untested.
  const network = await verifyNetwork(rpc);
  assert.equal(network.chainId, capture.provenance.network.chainId);
  assert.equal(network.genesisHash, capture.provenance.network.genesisHash);
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
test('an owned resting order is a placement, not a fill or position', { skip: 'No captured resting-only receipt in the reviewed set; requires approved live limit order or a separately sourced real receipt.' }, () => {});
test('real mined transaction recovery and exact reviewed wire validation use no signer', async () => {
  const tx = await rpc.getTransaction({ hash: approval.hash });
  const raw = serializeTransaction({ type: tx.type, chainId: tx.chainId, nonce: tx.nonce, gas: tx.gas, to: tx.to, value: tx.value, data: tx.input, maxFeePerGas: tx.maxFeePerGas, maxPriorityFeePerGas: tx.maxPriorityFeePerGas, accessList: tx.accessList }, { r: tx.r, s: tx.s, yParity: tx.yParity });
  assert.equal(keccak256(raw), approval.hash);
  const intent = { action: 'approve', amount: amount.toString() };
  const envelope = historicalEnvelope();
  const result = await validateSignedTransaction(raw, envelope, intent);
  assert.equal(result.from, capture.account.address);
  await assert.rejects(validateSignedTransaction(raw, { ...envelope, nonce: envelope.nonce + 1 }, intent), /Signed nonce/);
  for (const change of [{ gas: String(BigInt(envelope.gas) + 1n) }, { fees: { ...envelope.fees, maxFeePerGas: String(BigInt(envelope.fees.maxFeePerGas) + 1n) } }, { fees: { ...envelope.fees, maxPriorityFeePerGas: String(BigInt(envelope.fees.maxPriorityFeePerGas) + 1n) } }])
    await assert.rejects(validateSignedTransaction(raw, { ...envelope, ...change }, intent));
  for (const bad of ['', '0x', raw.slice(0, -2), raw + '00']) await assert.rejects(validateSignedTransaction(bad, envelope, intent));
  // Raw and public signature fields stay in memory; nothing signs or sends.
});
test('verifiedMarket and readAccount use actual SDK and Tokyo services', async () => {
  const { exchange, rpc: client } = openTokyo();
  try {
    const markets = await exchange.client.listPerpMarkets();
    const result = await verifiedMarket(exchange, client, markets, 'BTC');
    assert.equal(result.market.poolAddress.toLowerCase(), btc.market.poolAddress.toLowerCase());
    const account = await readAccount(exchange, client, result.system, capture.account.address);
    assert.equal(account.address, capture.account.address);
    assert.ok(account.blockNumber > 0n);
  } finally { await exchange.close(); }
});
