import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeFunctionData, formatUnits } from 'viem';
import { perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { walletAddress, bountyAddress, exactUnits, orderParams, buildUnsignedOrder, receiptEvidence } from '../src/lib/dreamdex.mjs';
import { btc, capture, decodedOrder, orderInput, bigintGrid } from './fixtures/captured.mjs';
import { createDreamdexHarness } from './helpers/dreamdex-harness.mjs';
test('dreamdex: walletAddress and bountyAddress validation', () => {
  assert.equal(walletAddress(capture.account.address.toLowerCase()), capture.account.address);
  assert.equal(bountyAddress(capture.account.address), capture.account.address);
  assert.throws(() => bountyAddress(capture.system.marginBank));
});
test('dreamdex: exactUnits parsing and validation', () => {
  assert.equal(exactUnits(orderInput.quantity, btc.market.baseDecimals, 'Quantity'), decodedOrder.args[3]);
  assert.equal(exactUnits(formatUnits(BigInt(capture.account.walletCollateral), 18), 18, 'Collateral'), BigInt(capture.account.walletCollateral));
  for (const invalid of ['abc', '-1', '0']) assert.throws(() => exactUnits(invalid, 18, 'Amount'));
});
test('dreamdex: orderParams validation with grid constraints', () => {
  const grid = bigintGrid(btc);
  const result = orderParams(btc.market, grid, orderInput);
  assert.equal(result.price, decodedOrder.args[2]);
  assert.equal(result.quantity, decodedOrder.args[3]);
  assert.throws(() => orderParams(btc.market, grid, { ...orderInput, price: formatUnits(result.price + 1n, btc.market.quoteDecimals) }));
});
test('dreamdex: buildUnsignedOrder encoding', () => {
  const timestamp = BigInt(capture.execution[2].block.timestamp);
  const result = buildUnsignedOrder(orderParams(btc.market, bigintGrid(btc), orderInput), timestamp);
  const decoded = decodeFunctionData({ abi: perpPoolWriteAbi, data: result.data });
  assert.equal(decoded.args[2], decodedOrder.args[2]);
  assert.equal(decoded.args[3], decodedOrder.args[3]);
  assert.equal(decoded.args[4], (timestamp + 300n) * 1_000_000_000n);
});
test('dreamdex: openTokyo, verifyNetwork and saveEvidence use isolated boundaries', async () => {
  const h = await createDreamdexHarness();
  const { rpc, exchange } = h.openTokyo();
  try {
    assert.equal(rpc, h.rpc);
    const client = h.calls.find(([name]) => name === 'client')[1];
    const config = h.calls.find(([name]) => name === 'sdk')[1];
    assert.equal(client.chain.id, 50383); assert.equal(config.chain.id, 50383);
    assert.equal(config.indexerUrl, capture.provenance.network.indexer);
    assert.equal(config.addresses.marginBank.toLowerCase(), capture.system.marginBank.toLowerCase());
    assert.deepEqual(h.calls.find(([name]) => name === 'transport').slice(1), [undefined, { timeout: 15000, retryCount: 1 }]);
    const network = await h.verifyNetwork(rpc);
    assert.deepEqual(network, capture.provenance.network);
    let genesisCalls = 0;
    await assert.rejects(h.verifyNetwork({ getChainId: async () => 1, getBlock: async () => { genesisCalls++; } }), /RPC is not Tokyo testnet/);
    assert.equal(genesisCalls, 0);
    const files = await Promise.all([h.saveEvidence('controlled-network', network), h.saveEvidence('controlled-network', network)]);
    assert.notEqual(files[0].href, files[1].href); assert.equal(h.files.size, 2);
    for (const file of files) {
      const saved = JSON.parse(h.files.get(file.href));
      assert.equal(saved.genesisHash, network.genesisHash);
      assert.equal(saved.recordedAt, new Date(Number(capture.provenance.block.timestamp) * 1000).toISOString());
    }
    for (const call of h.calls.filter(([name]) => name === 'mkdir')) assert.deepEqual(call[2], { recursive: true });
  } finally { await exchange.close(); }
  assert.equal(h.calls.filter(([name]) => name === 'close').length, 1);
});
test('captured verified markets retain on-chain bank and grid agreement', () => {
  for (const snapshot of capture.snapshots) {
    assert.equal(snapshot.market.marginBank.toLowerCase(), capture.system.marginBank.toLowerCase());
    for (const key of ['tickSize', 'minQuantity', 'lotSize']) assert.equal(snapshot.grid[key], snapshot.market[key]);
  }
});
test('captured public account agrees with the historical signer address', () => {
  assert.equal(capture.account.address.toLowerCase(), capture.execution[0].transaction.from.toLowerCase());
  assert.ok(BigInt(capture.account.walletCollateral) >= 0n);
  assert.ok(Array.isArray(capture.account.state.activePerpPools));
});
test('dreamdex: receiptEvidence checks receipt status and fails without events', () => {
  assert.throws(() => receiptEvidence(capture.execution[1].receipt, btc.market, capture.account.address));
  assert.equal(receiptEvidence(capture.execution[2].receipt, btc.market, capture.account.address).transactionConfirmed, true);
});
