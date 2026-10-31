import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPublicClient, http, serializeTransaction, keccak256 } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { openTokyo, verifyNetwork, verifiedMarket, readAccount } from '../../src/lib/dreamdex.mjs';
import { validateSignedTransaction } from '../../src/lib/offline-transactions.mjs';
import { capture, btc, approval, amount, historicalEnvelope } from '../fixtures/captured.mjs';

// Retained real-service checks, explicitly opt-in and excluded from npm test.
// Read-only: public already-mined fields stay in memory, with no signer or send.
const rpc = createPublicClient({ chain: hidekiTestnet, transport: http(undefined, { retryCount: 0, timeout: 15000 }) });
test('real read-only Tokyo network verification matches captured genesis', async () => {
  const network = await verifyNetwork(rpc);
  assert.equal(network.chainId, capture.provenance.network.chainId);
  assert.equal(network.genesisHash, capture.provenance.network.genesisHash);
});
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
