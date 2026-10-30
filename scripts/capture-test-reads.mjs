// Public read-only capture. No signer, environment secrets, simulation or sends.
import { writeFile, mkdir } from 'node:fs/promises';
import { erc20Abi, parseAbi, decodeFunctionData } from 'viem';
import { perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { openTokyo, verifyNetwork, INDEXER, BOUNTY_EOA, json } from '../src/lib/dreamdex.mjs';

const bank = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';
const token = '0xed7993A74dAe1e6656B704A424DcD8711aAf4F72';
const poolAbi = parseAbi([
  'function marginBank() view returns (address)',
  'function getOneBase() view returns (uint256)',
  'function getOrderBookParameters() view returns ((uint256 tickSize,uint256 minQuantity,uint256 lotSize))',
  'function tryGetMarkPrice() view returns (bool,uint256)',
  'function getCurrentFundingRate() view returns (int256)',
  'function getFundingParameters() view returns ((uint64 fundingCalculationWindowSec,uint64 fundingSettlementIntervalSec,int256 interestRatePerWindow,int256 maxFundingRatePerWindow,int256 dampener,uint256 emaSmoothingAlpha,uint64 maxOracleStalenessSec))',
  'function getPerpPoolParameters() view returns ((uint16 initialMarginBps,uint16 maintenanceMarginBps,uint16 closeOutMarginBps,uint128 maxOpenInterest,uint128 maxPositionSize,uint32 takerFeeBpsTimes1k,int32 makerFeeBpsTimes1k,uint16 insuranceFundShareBps))',
]);
const bankAbi = parseAbi([
  'function getAccountState(address) view returns ((int256 unlockedCollateralBalance,uint256 lockedCollateral,address[] activePerpPools))',
  'function getAccountHealth(address) view returns (int256,uint256,uint256,uint256)',
  'function getPosition(address,address) view returns ((int128 size,uint128 avgEntryPrice,int256 entryFundingIndex,uint64 lastUpdatedTimestampNs))',
]);
const hashes = [
  '0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17',
  '0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a',
  '0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a',
];
const { exchange, rpc } = openTokyo();
const rpcReads = [];
async function read(address, abi, functionName, args, blockNumber) {
  const result = await rpc.readContract({ address, abi, functionName, args, blockNumber });
  rpcReads.push({ source: 'eth_call', address, functionName, args: args || [], blockNumber, result });
  return result;
}
async function graph(query, variables) {
  const response = await fetch(INDEXER, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  const result = await response.json();
  if (!response.ok || result.errors) throw new Error('Indexer capture failed');
  return { source: INDEXER, query, variables, result };
}
try {
  const network = await verifyNetwork(rpc);
  const block = await rpc.getBlock();
  const markets = await exchange.client.listPerpMarkets();
  const system = await exchange.client.getPerpSystemConfig(bank);
  if (!system.fullyWired || system.collateralToken.toLowerCase() !== token.toLowerCase()) throw new Error('System mismatch');
  const snapshots = [];
  for (const market of markets) {
    const address = market.poolAddress;
    const [marginBank, oneBase, grid, mark, parameters, funding, fundingParameters] = await Promise.all([
      ...['marginBank', 'getOneBase', 'getOrderBookParameters', 'tryGetMarkPrice', 'getPerpPoolParameters', 'getCurrentFundingRate', 'getFundingParameters'].map(name => read(address, poolAbi, name, [], block.number)),
    ]);
    if (marginBank.toLowerCase() !== bank.toLowerCase() || oneBase !== 10n ** BigInt(market.baseDecimals)) throw new Error('Market mismatch');
    for (const key of ['tickSize', 'minQuantity', 'lotSize']) if (grid[key] !== BigInt(market[key])) throw new Error('Grid mismatch');
    snapshots.push({ market, oneBase, grid, mark, parameters, funding, fundingParameters });
  }
  const btc = snapshots.find(s => s.market.baseSymbol === 'BTC');
  const pepe = snapshots.find(s => s.market.baseSymbol === '1000PEPE');
  if (!btc || !pepe) throw new Error('Required market absent');
  const account = {
    address: BOUNTY_EOA,
    gas: await rpc.getBalance({ address: BOUNTY_EOA, blockNumber: block.number }),
    walletCollateral: await read(token, erc20Abi, 'balanceOf', [BOUNTY_EOA], block.number),
    allowance: await read(token, erc20Abi, 'allowance', [BOUNTY_EOA, bank], block.number),
    state: await read(bank, bankAbi, 'getAccountState', [BOUNTY_EOA], block.number),
    health: await read(bank, bankAbi, 'getAccountHealth', [BOUNTY_EOA], block.number),
    position: await read(bank, bankAbi, 'getPosition', [BOUNTY_EOA, btc.market.poolAddress], block.number),
  };
  const execution = [];
  for (const hash of hashes) {
    const receipt = await rpc.getTransactionReceipt({ hash });
    const transaction = await rpc.getTransaction({ hash });
    const canonicalBlock = await rpc.getBlock({ blockNumber: receipt.blockNumber });
    if (canonicalBlock.hash !== receipt.blockHash || receipt.status !== 'success' || transaction.from.toLowerCase() !== BOUNTY_EOA.toLowerCase()) throw new Error('Historical receipt mismatch');
    // Do not persist raw transactions or signatures. Only public unsigned fields.
    const { from, to, input, value, nonce, gas, maxFeePerGas, maxPriorityFeePerGas, chainId, type } = transaction;
    execution.push({ source: 'eth_getTransactionReceipt / eth_getTransactionByHash', hash, receipt, block: { number: canonicalBlock.number, hash: canonicalBlock.hash, timestamp: canonicalBlock.timestamp }, transaction: { from, to, input, value, nonce, gas, maxFeePerGas, maxPriorityFeePerGas, chainId, type } });
  }
  const historicalPosition = await read(bank, bankAbi, 'getPosition', [BOUNTY_EOA, btc.market.poolAddress], execution[2].receipt.blockNumber);
  const regressionBlock = await rpc.getBlock({ blockNumber: 37084078n });
  const regressionMark = await read(pepe.market.poolAddress, poolAbi, 'tryGetMarkPrice', [], regressionBlock.number);
  const candles = await graph('query CapturedCandles($pool: String!) { Candle(where: {pool: {_eq: $pool}, intervalSeconds: {_eq: 3600}}, order_by: [{bucketStart: desc}], limit: 300) { bucketStart intervalSeconds openPrice high low closePrice baseVolume } }', { pool: btc.market.poolAddress.toLowerCase() });
  const history = await graph('query CapturedHistory($account: String!) { Fill(where: {_or: [{taker: {_eq: $account}}, {maker: {_eq: $account}}]}, order_by: [{timestamp: asc}], limit: 100) {id txHash blockNumber timestamp pool fillPrice quantity taker maker takerIsBid} }', { account: BOUNTY_EOA.toLowerCase() });
  const positionHistory = [];
  for (const fill of history.result.data.Fill.filter(f => f.pool.toLowerCase() === btc.market.poolAddress.toLowerCase())) {
    positionHistory.push({ blockNumber: fill.blockNumber, hash: fill.txHash, position: await read(bank, bankAbi, 'getPosition', [BOUNTY_EOA, btc.market.poolAddress], BigInt(fill.blockNumber)) });
  }
  const capture = { provenance: { capturedAt: new Date().toISOString(), documentation: 'https://app.testnet.dreamdex.io/docs/developers/perps-testnet', sdk: '0.32.1', network, block: { number: block.number, hash: block.hash, timestamp: block.timestamp }, note: 'Unmodified public read results; historical snapshots are not current financial claims. No simulation, signing or sends.' }, system, snapshots, account, execution, historicalPosition, positionHistory, regression: { block: { number: regressionBlock.number, hash: regressionBlock.hash }, market: pepe.market, mark: regressionMark, grid: pepe.grid }, candles, history, rpcReads };
  await mkdir(new URL('../test/fixtures/', import.meta.url), { recursive: true });
  await writeFile(new URL('../test/fixtures/tokyo-public-reads.json', import.meta.url), json(capture) + '\n');
  console.log(json({ capturedAt: capture.provenance.capturedAt, block: block.number, markets: snapshots.length, candles: candles.result.data.Candle.length, historicalPositions: positionHistory.length, order: decodeFunctionData({ abi: perpPoolWriteAbi, data: execution[2].transaction.input }).functionName }));
} finally { await exchange.close(); }
