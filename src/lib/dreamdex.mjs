import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  SomniaMarkets, SOMNIA_HIDEKI_TESTNET_ADDRESSES,
  orderBookEventsAbi, marginBankEventsAbi, perpPoolWriteAbi,
} from '@somnia-chain/markets-sdk';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import {
  createPublicClient, http, erc20Abi, parseAbi, parseUnits,
  getAddress, isAddress, parseEventLogs, encodeFunctionData, zeroAddress,
} from 'viem';

export const INDEXER = 'https://hideki-dev.smk.somnia.host/v1/graphql';
export const EXPLORER = 'https://explorer.testnet.somnia.network/tokyo';
export const BOUNTY_EOA = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
export const json = value => JSON.stringify(value, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
const sameAddress = (a, b) => a.toLowerCase() === b.toLowerCase();

// Read signatures checked against the published SDK 0.32.1 readsAbi.ts.
const poolAbi = parseAbi([
  'function marginBank() view returns (address)',
  'function getOneBase() view returns (uint256)',
  'function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))',
]);

export function walletAddress(value) {
  assert(typeof value === 'string' && isAddress(value), 'Expected a valid public wallet address (0x + 40 hex digits)');
  return getAddress(value);
}

export function bountyAddress(value) {
  const address = walletAddress(value);
  assert(sameAddress(address, BOUNTY_EOA), 'Only the authorized bounty EOA may prepare transactions');
  return address;
}

export function exactUnits(value, decimals, label) {
  assert(typeof value === 'string' && /^\d+(\.\d+)?$/.test(value), `${label} must be a positive decimal string`);
  assert((value.split('.')[1]?.length ?? 0) <= decimals, `${label} exceeds market decimals; refusing to round`);
  const raw = parseUnits(value, decimals);
  assert(raw > 0n, `${label} must be greater than zero`);
  return raw;
}

export function openTokyo() {
  assert(hidekiTestnet.id === 50383 && hidekiTestnet.testnet, 'Only Tokyo testnet is supported');
  return {
    rpc: createPublicClient({ chain: hidekiTestnet, transport: http(undefined, { timeout: 15_000, retryCount: 1 }) }),
    exchange: new SomniaMarkets({ chain: hidekiTestnet, indexerUrl: INDEXER, addresses: SOMNIA_HIDEKI_TESTNET_ADDRESSES }),
  };
}

export async function verifyNetwork(rpc) {
  const chainId = await rpc.getChainId();
  assert.equal(chainId, 50383, 'RPC is not Tokyo testnet');
  const genesis = await rpc.getBlock({ blockNumber: 0n });
  return { chainId, rpc: hidekiTestnet.rpcUrls.default.http[0], indexer: INDEXER, explorer: EXPLORER, genesisHash: genesis.hash };
}

export async function verifiedMarket(exchange, rpc, markets, symbol) {
  const matches = markets.filter(m => m.baseSymbol === symbol);
  assert.equal(matches.length, 1, `No unique live perp market for ${symbol}`);
  const market = matches[0];
  assert(market.marketType === 'PERP' && market.chainId === 50383, 'Wrong market type or chain');
  for (const decimals of [market.baseDecimals, market.quoteDecimals]) {
    assert(Number.isInteger(decimals) && decimals >= 0 && decimals <= 255, 'Invalid market decimals');
  }
  const blockNumber = await rpc.getBlockNumber();
  const read = functionName => rpc.readContract({ address: market.poolAddress, abi: poolAbi, functionName, blockNumber });
  const [marginBank, oneBase, grid] = await Promise.all([
    read('marginBank'), read('getOneBase'), read('getOrderBookParameters'),
  ]);
  assert(sameAddress(marginBank, market.marginBank), 'Indexer MarginBank differs from pool');
  assert.equal(oneBase, 10n ** BigInt(market.baseDecimals), 'Indexer base decimals differ from pool');
  const system = await exchange.client.getPerpSystemConfig(marginBank);
  assert(system.fullyWired, 'Perps system is not fully wired');
  assert(sameAddress(system.collateralToken, market.quoteToken), 'Indexer quote token differs from MarginBank');
  const quoteDecimals = await rpc.readContract({ address: system.collateralToken, abi: erc20Abi, functionName: 'decimals', blockNumber });
  assert.equal(quoteDecimals, market.quoteDecimals, 'Indexer quote decimals differ from collateral');
  for (const field of ['tickSize', 'minQuantity', 'lotSize']) {
    assert(grid[field] > 0n, `Invalid ${field}`);
    assert.equal(grid[field], BigInt(market[field]), `Indexer ${field} differs from pool; refresh before ordering`);
  }
  return { market, system, grid, blockNumber };
}

export async function readAccount(exchange, rpc, system, address) {
  const margin = await exchange.client.getMarginAccount(system.marginBank, address);
  const blockNumber = margin.asOfBlock;
  const [gas, walletCollateral, code, voucher] = await Promise.all([
    rpc.getBalance({ address, blockNumber }),
    rpc.readContract({ address: system.collateralToken, abi: erc20Abi, functionName: 'balanceOf', args: [address], blockNumber }),
    rpc.getCode({ address, blockNumber }),
    exchange.client.getPerpVoucherEligibility(system.marginBank, address),
  ]);
  return { address, blockNumber, gas, walletCollateral, accountHasCode: !!code, margin, voucher };
}

export function orderParams(market, grid, { side, quantity, price }) {
  assert(['buy', 'sell'].includes(side), 'Side must be buy or sell');
  const rawPrice = exactUnits(price, market.quoteDecimals, 'Price');
  const rawQuantity = exactUnits(quantity, market.baseDecimals, 'Quantity');
  assert(rawPrice % grid.tickSize === 0n, 'Price is not on the tick grid');
  assert(rawQuantity % grid.lotSize === 0n, 'Quantity is not on the lot grid');
  assert(rawQuantity >= grid.minQuantity, 'Quantity is below the market minimum');
  return { pool: market.poolAddress, isBid: side === 'buy', price: rawPrice, quantity: rawQuantity, orderType: 2 };
}

export function receiptEvidence(receipt, market, account) {
  assert.equal(receipt.status, 'success', 'Transaction reverted; this is not execution evidence');
  const poolLogs = receipt.logs.filter(log => sameAddress(log.address, market.poolAddress));
  const bankLogs = receipt.logs.filter(log => sameAddress(log.address, market.marginBank));
  const orders = parseEventLogs({ abi: orderBookEventsAbi, logs: poolLogs, eventName: 'OrderPlaced' })
    .filter(log => sameAddress(log.args.placedOrder.owner, account));
  const positions = parseEventLogs({ abi: marginBankEventsAbi, logs: bankLogs, eventName: 'PositionUpdated' })
    .filter(log => sameAddress(log.args.account, account) && sameAddress(log.args.perpPool, market.poolAddress));
  const poolFills = parseEventLogs({ abi: orderBookEventsAbi, logs: poolLogs, eventName: 'OrderFilled' });
  assert(orders.length || positions.length, 'No placement or position event for this account and pool');
  return {
    transactionConfirmed: true,
    accountOrderEvents: orders,
    accountPositionEvents: positions,
    // Pool-level fills may include other calls/accounts in a batched transaction.
    poolFillEvents: poolFills,
    poolFillObserved: poolFills.length > 0,
    pnl: null,
  };
}

export function buildUnsignedOrder(params, blockTimestamp) {
  // SDK buildPlacePerpOrder requires a signer; encode its public ABI without one.
  const expireTimestampNs = (blockTimestamp + 300n) * 1_000_000_000n;
  return {
    chainId: 50383, to: params.pool, value: 0n, expireTimestampNs,
    data: encodeFunctionData({
      abi: perpPoolWriteAbi, functionName: 'placeOrder',
      args: [params.isBid, 0n, params.price, params.quantity, expireTimestampNs, params.orderType, 0, zeroAddress, 0n],
    }),
  };
}

export async function saveEvidence(kind, data) {
  const directory = new URL('../../evidence/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const file = new URL(`${kind}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, directory);
  await writeFile(file, json({ recordedAt: new Date().toISOString(), ...data }) + '\n', { flag: 'wx' });
  return file;
}
