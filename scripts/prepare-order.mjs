import assert from 'node:assert/strict';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { formatUnits } from 'viem';
import { openTokyo, verifyNetwork, verifiedMarket, readAccount, bountyAddress, orderParams, buildUnsignedOrder, saveEvidence, json } from '../src/lib/dreamdex.mjs';
import { assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

// Fail closed until this preview integrates the complete wallet-bound envelope.
assertOnchainActionAllowed('order');

const { values } = parseArgs({ options: Object.fromEntries(['address', 'market', 'side', 'quantity', 'price'].map(key => [key, { type: 'string' }])) });
const address = bountyAddress(values.address);
assert(values.market && values.side && values.quantity && values.price, 'Required: --address --market --side --quantity --price');
const { exchange, rpc } = openTokyo();
try {
  const network = await verifyNetwork(rpc);
  const markets = await exchange.client.listPerpMarkets();
  const verified = await verifiedMarket(exchange, rpc, markets, values.market);
  const params = orderParams(verified.market, verified.grid, values);
  const [account, maximum, book] = await Promise.all([
    readAccount(exchange, rpc, verified.system, address),
    exchange.client.getMaxPerpOrderSize({ ...params, marginBank: verified.market.marginBank, account: address }),
    exchange.client.getBookTopsOnchain([verified.market]),
  ]);
  const blockers = [];
  if (account.gas === 0n) blockers.push('No STT for a self-funded transaction');
  if (!maximum.priceable) blockers.push('No Data: mark price is stale');
  else if (!maximum.placeable || params.quantity > maximum.maxQuantity) blockers.push(`Order unavailable at this size: ${maximum.limitedBy}`);
  const top = book.tops[verified.market.id.toLowerCase()];
  const opposite = params.isBid ? top?.bestAsk : top?.bestBid;
  if (opposite == null) blockers.push('No Data: opposite side of book is empty');
  else if (params.isBid ? params.price < BigInt(opposite) : params.price > BigInt(opposite)) blockers.push('IOC price does not cross the current book');
  const order = buildUnsignedOrder(params, (await rpc.getBlock()).timestamp);
  const plan = {
    kind: 'unsigned-order', network, account: address, market: verified.market,
    params, order: { ...order, from: address }, maximum, book, blockers,
    notionalAtLimit: formatUnits(params.price * params.quantity, verified.market.baseDecimals + verified.market.quoteDecimals),
    transactionHash: null,
    note: 'Unsigned IOC, expires in five minutes. May fill partially or revert with no fill. Revalidate before signing. Sizing uses bank margin only. Execution by the owner may auto-pull approved wallet collateral under protocol rules; this script sends nothing.',
  };
  console.log(json(plan));
  console.log(`Evidence: ${fileURLToPath(await saveEvidence('prepared-order', plan))}`);
  if (blockers.length) process.exitCode = 2;
} catch (error) {
  console.error(`Order preparation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await exchange.close();
}
