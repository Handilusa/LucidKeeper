import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { formatUnits } from 'viem';
import { openTokyo, verifyNetwork, verifiedMarket, readAccount, walletAddress, saveEvidence } from '../src/lib/dreamdex.mjs';

const { values } = parseArgs({ options: { address: { type: 'string' }, market: { type: 'string', default: 'BTC' } } });
const address = values.address ? walletAddress(values.address) : null;
const { exchange, rpc } = openTokyo();
try {
  const network = await verifyNetwork(rpc);
  const markets = await exchange.client.listPerpMarkets();
  if (!markets.length) throw new Error('No Data: no perp markets returned by the official indexer');
  const verified = await verifiedMarket(exchange, rpc, markets, values.market);
  const [book, feed, account] = await Promise.all([
    exchange.client.getBookTopsOnchain([verified.market]),
    exchange.client.getPerpFeedStatus(verified.market.poolAddress),
    address ? readAccount(exchange, rpc, verified.system, address) : null,
  ]);
  const quoteDecimals = verified.market.quoteDecimals;
  const formatPrice = value => value == null ? 'No Data' : formatUnits(BigInt(value), quoteDecimals);
  const top = book.tops[verified.market.id.toLowerCase()];
  console.log(`Tokyo ${network.chainId}: ${markets.length} indexed perp markets`);
  console.table(markets.map(m => ({ market: m.baseSymbol, baseDecimals: m.baseDecimals, quoteDecimals: m.quoteDecimals, indexedMinQuantity: formatUnits(BigInt(m.minQuantity), m.baseDecimals), pool: m.poolAddress })));
  console.log(`${values.market} on-chain book at ${book.blockNumber}: bid ${formatPrice(top?.bestBid)}, ask ${formatPrice(top?.bestAsk)}`);
  console.log(`Mark: ${feed.markPriceOk ? formatPrice(feed.markPrice) : 'No Data (stale mark feed)'}`);
  const blockers = [];
  if (!account) blockers.push('No Data: supply --address to inspect collateral');
  else {
    console.log(`Account ${address} at block ${account.blockNumber}`);
    console.log(`Gas: ${formatUnits(account.gas, 18)} STT; wallet: ${formatUnits(account.walletCollateral, quoteDecimals)} USDso`);
    console.log(`MarginBank: unlocked ${formatUnits(account.margin.unlockedCollateralBalance, quoteDecimals)}, locked ${formatUnits(account.margin.lockedCollateral, quoteDecimals)} USDso; positions: ${account.margin.activePerpPools.length}`);
    if (account.gas === 0n) blockers.push('No STT for a self-funded transaction');
    if (account.margin.equity <= 0n) blockers.push('No positive equity in MarginBank');
    console.log(account.voucher.eligible ? `Voucher eligible: ${formatUnits(account.voucher.grantAmount, quoteDecimals)} paper USDso (not claimed by this script)` : `Voucher ineligible: ${account.voucher.reason}`);
  }
  if (!feed.markPriceOk) blockers.push('No live mark price');
  if (blockers.length) console.log('Readiness:', blockers.join('; '));
  const file = await saveEvidence('connectivity', { kind: 'read-only', network, markets, verified, book, feed, account, blockers, transactionHash: null });
  console.log(`Evidence: ${fileURLToPath(file)}`);
} catch (error) {
  console.error(`Connectivity failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await exchange.close();
}
