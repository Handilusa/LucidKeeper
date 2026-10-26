import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { openTokyo, verifyNetwork, verifiedMarket, walletAddress, receiptEvidence, saveEvidence, json } from '../src/lib/dreamdex.mjs';

const { values } = parseArgs({ options: Object.fromEntries(['address', 'market', 'hash'].map(key => [key, { type: 'string' }])) });
const address = walletAddress(values.address);
assert(values.market && /^0x[0-9a-fA-F]{64}$/.test(values.hash ?? ''), 'Required: --market and a valid --hash');
const { exchange, rpc } = openTokyo();
try {
  const network = await verifyNetwork(rpc);
  const markets = await exchange.client.listPerpMarkets();
  const { market } = await verifiedMarket(exchange, rpc, markets, values.market);
  const receipt = await rpc.getTransactionReceipt({ hash: values.hash });
  const block = await rpc.getBlock({ blockNumber: receipt.blockNumber });
  assert.equal(block.hash, receipt.blockHash, 'Receipt is no longer in the canonical block');
  const evidence = receiptEvidence(receipt, market, address);
  const latestPosition = await exchange.client.getPerpPosition({ marginBank: market.marginBank, pool: market.poolAddress, account: address });
  const record = { network, account: address, market, transactionHash: receipt.transactionHash, receipt, ...evidence, latestPosition, note: 'Position read after verification; account events describe the transaction. Pool fills are not an account PnL calculation or proof of Lucidkeeper authorship.' };
  console.log(json(evidence));
  console.log(`Evidence: ${fileURLToPath(await saveEvidence('transaction', record))}`);
} catch (error) {
  console.error(`Verification failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await exchange.close();
}
