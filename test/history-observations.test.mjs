import test, { beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { capture } from './fixtures/captured.mjs';

// Exercise the real production readers, bundled only in memory. All transport is
// injected in this test process; no test fixtures are imported by the application.
let payload;
const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const originalStorage = globalThis.localStorage;
const storage = new Map();
globalThis.fetch = async (url) => {
  assert.equal(url, 'https://hideki-dev.smk.somnia.host/v1/graphql');
  return Response.json(payload);
};
globalThis.window = {};
globalThis.localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
mock.method(console, 'warn', () => {});
const root = fileURLToPath(new URL('../', import.meta.url));
const bundled = await build({
  stdin: { contents: "export * from './src/lib/data/indexer.ts'; export * from './src/lib/data/tradeHistory.ts';", resolveDir: root, loader: 'ts' },
  absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', write: false,
});
const readers = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString('base64')}`);
const account = capture.history.variables.account;
const fill = capture.history.result.data.Fill[0];
const hash = fill.txHash; // Historical public hash; fixtures are not new chain evidence.
const margin = { id: 'controlled-margin', txHash: hash, blockNumber: fill.blockNumber, timestamp: fill.timestamp, account, kind: 'Deposit', amount: '1000000000000000000' };
const order = { id: 'controlled-order', orderId: '1', owner: account, pool: fill.pool, isBid: false, price: fill.fillPrice, fullQuantity: fill.quantity, quantityRemaining: fill.quantity, placedTxHash: hash, placedAtTimestamp: fill.timestamp, status: 'Open' };
const history = () => readers.fetchUserTradeHistory(account);
const active = () => readers.fetchUserActiveOrders(account);
const setHistory = (Fill = [], MarginEvent = []) => { payload = { data: { Fill, MarginEvent } }; };
const cacheKey = `lucidkeeper_cache_trades_v2_50383_${account}_30_0`;
const rpcLog = { args: { account, amount: 0n }, transactionHash: hash, blockNumber: 100n, logIndex: 0 };
const rpc = (deposits = [], withdrawals = []) => ({
  getBlockNumber: async () => 100n,
  getLogs: async ({ event, strict }) => { assert.equal(strict, true); return event.name === 'Deposited' ? deposits : withdrawals; },
});

beforeEach(() => { storage.clear(); setHistory(); });
after(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window; else globalThis.window = originalWindow;
  if (originalStorage === undefined) delete globalThis.localStorage; else globalThis.localStorage = originalStorage;
  mock.restoreAll();
});

test('captured indexed fills retain actual quantities, prices, hashes and seconds', async () => {
  setHistory([fill]);
  const [item] = await history();
  assert.equal(item.size, 0.00013);
  assert.equal(item.price, 79946);
  assert.equal(item.hash, hash);
  assert.equal(item.timestamp, Number(fill.timestamp) * 1000);
  assert.equal(item.side, 'buy');
  storage.clear(); setHistory([{ ...fill, taker: fill.maker, maker: account }]);
  assert.equal((await history())[0].side, 'sell');
});

test('missing and malformed indexed observations reject instead of becoming zeros/epoch', async () => {
  for (const [row, field, array] of [
    ...['quantity', 'fillPrice', 'timestamp', 'blockNumber', 'txHash', 'takerIsBid', 'taker', 'maker', 'id'].map(field => [fill, field, 'Fill']),
    ...['amount', 'timestamp', 'blockNumber', 'txHash', 'kind', 'account', 'id'].map(field => [margin, field, 'MarginEvent']),
  ]) {
    for (const missing of [undefined, null, '']) {
      storage.clear(); setHistory(); payload.data[array] = [{ ...row, [field]: missing }];
      await assert.rejects(history(), /unavailable/, `${array}.${field} = ${missing}`);
      assert.equal(storage.has(cacheKey), false);
    }
  }
  for (const invalid of ['1x', '1.5', '-1', {}, false, Number.MAX_SAFE_INTEGER + 1, '9'.repeat(400)]) {
    setHistory([{ ...fill, quantity: invalid }]);
    await assert.rejects(history(), /unavailable/);
  }
  setHistory([{ ...fill, timestamp: '1793056615oops' }]);
  await assert.rejects(history(), /unavailable/);
  setHistory([{ ...fill, timestamp: '1793056615000000000' }]);
  await assert.rejects(history(), /unavailable/); // No guessed ns/ms scale.
});

test('both selected history arrays are required on every page; real empty arrays succeed', async () => {
  for (const data of [{}, { Fill: [] }, { MarginEvent: [] }, { Fill: null, MarginEvent: [] }, { Fill: [], MarginEvent: {} }]) {
    payload = { data };
    await assert.rejects(history(), /response unavailable/);
    await assert.rejects(readers.fetchUserTradeHistory(account, 20, 20), /response unavailable/);
  }
  setHistory(); assert.deepEqual(await history(), []);
  assert.deepEqual(await readers.fetchUserTradeHistory(account, 20, 20), []);
});

test('explicit financial zero and explicit Unix epoch are preserved, not treated as absence', async () => {
  setHistory([{ ...fill, quantity: '0', fillPrice: 0, timestamp: 0, blockNumber: 0 }], [{ ...margin, amount: '0', timestamp: '0' }]);
  const items = await history();
  assert.equal(items[0].size, 0); assert.equal(items[0].price, 0); assert.equal(items[0].timestamp, 0);
  assert.equal(items[1].amountUsdso, 0);
});

test('fills and active orders reject unknown or absent pools, never guess PERP/8 decimals', async () => {
  for (const pool of [undefined, null, '', account]) {
    setHistory([{ ...fill, pool }]); await assert.rejects(history(), /unavailable/);
    payload = { data: { Order: [{ ...order, pool }] } }; await assert.rejects(active(), /unavailable/);
  }
  const markets = await readers.fetchPerpMarkets();
  for (const market of markets) {
    storage.clear();
    const quantity = (10n ** BigInt(market.baseDecimals)).toString();
    setHistory([{ ...fill, pool: market.poolAddress, quantity }]);
    assert.equal((await history())[0].size, 1, market.baseSymbol);
    payload = { data: { Order: [{ ...order, pool: market.poolAddress, fullQuantity: quantity, quantityRemaining: quantity }] } };
    const [item] = await active();
    assert.equal(item.fullQuantity, 1); assert.equal(item.quantityRemaining, 1);
    assert.equal(item.marketSymbol, market.baseSymbol); assert.equal(item.side, 'sell');
  }
});

test('active orders require complete numeric, timestamp and execution-identity fields', async () => {
  for (const field of ['price', 'fullQuantity', 'quantityRemaining', 'placedAtTimestamp', 'owner', 'isBid', 'placedTxHash', 'orderId', 'status', 'id']) {
    for (const missing of [undefined, null, '']) {
      payload = { data: { Order: [{ ...order, [field]: missing }] } };
      await assert.rejects(active(), /unavailable/, field);
    }
  }
  payload = { data: { Order: [{ ...order, price: '0', fullQuantity: '0', quantityRemaining: '0', placedAtTimestamp: '0' }] } };
  const [item] = await active(); assert.equal(item.price, 0); assert.equal(item.placedAtTimestamp, 0);
  payload = { data: { Order: [] } }; assert.deepEqual(await active(), []);
  payload = { data: {} }; await assert.rejects(active(), /unavailable/);
});

test('indexed cache ignores old transformed values and revalidates raw v2 observations', async () => {
  const oldKey = `lucidkeeper_cache_trades_50383_${account}_30_0`;
  const old = JSON.stringify({ observedAt: Date.now(), items: [{ size: 0, price: 0, timestamp: 0 }] });
  storage.set(oldKey, old); payload = { data: {} };
  await assert.rejects(history(), /unavailable/); assert.equal(storage.get(oldKey), old);
  storage.set(cacheKey, JSON.stringify({ observedAt: Date.now(), data: { Fill: [{ ...fill, quantity: null }], MarginEvent: [] } }));
  await assert.rejects(history(), /unavailable/);
  setHistory([fill]); await history(); payload = { data: {} };
  const [cached] = await history(); assert.equal(cached.source, 'cache'); assert.equal(cached.size, 0.00013);
  const snapshot = JSON.parse(storage.get(cacheKey));
  for (const observedAt of [Date.now() - 300001, Date.now() + 60000]) {
    storage.set(cacheKey, JSON.stringify({ ...snapshot, observedAt })); await assert.rejects(history(), /unavailable/);
  }
  storage.set(cacheKey, JSON.stringify({ observedAt: Date.now(), data: { Fill: [], MarginEvent: [] } }));
  await assert.rejects(history(), /unavailable/); // Empty cache cannot certify an unavailable live read.
});

test('RPC fallback preserves decoded zero and successful empty logs with observed timestamps', async () => {
  assert.deepEqual(await readers.fetchRpcTradeHistoryFallback(rpc(), account), []);
  const start = Date.now();
  const items = await readers.fetchRpcTradeHistoryFallback(rpc([rpcLog], [rpcLog]), account);
  assert.equal(items.length, 2);
  for (const item of items) {
    assert.equal(item.amountUsdso, 0); assert.equal(item.source, 'rpc_fallback');
    assert.ok(item.timestamp >= start); assert.equal(item.hash, hash);
  }
});

test('RPC fallback rejects missing decoded amounts/identity, partial results and transport failure', async () => {
  for (const malformed of [
    { ...rpcLog, args: { account } }, { ...rpcLog, args: { account, amount: null } },
    { ...rpcLog, args: { account: fill.maker, amount: 0n } }, { ...rpcLog, transactionHash: null },
    { ...rpcLog, blockNumber: null }, { ...rpcLog, logIndex: null },
  ]) {
    await assert.rejects(readers.fetchRpcTradeHistoryFallback(rpc([rpcLog], [malformed]), account), /unavailable|mismatch/);
  }
  await assert.rejects(readers.fetchRpcTradeHistoryFallback(rpc(null), account), /unavailable/);
  await assert.rejects(readers.fetchRpcTradeHistoryFallback({ getBlockNumber: async () => { throw new Error('Controlled RPC failure'); } }, account), /RPC failure/);
  await assert.rejects(readers.fetchRpcTradeHistoryFallback(null, account), /unavailable/);
});

test('requested-history cache keeps valid zero but excludes incomplete/invalid stored records', () => {
  const item = { id: 'controlled-request', hash, type: 'deposit', amountUsdso: 0, timestamp: Date.now(), description: 'Controlled request fixture, not verified fill' };
  readers.saveTradeHistoryItem(account, item);
  assert.deepEqual(readers.getTradeHistory(account), [item]);
  const key = [...storage.keys()][0];
  storage.set(key, JSON.stringify([item, { ...item, amountUsdso: null }, { ...item, timestamp: null }, { ...item, hash: '' }]));
  assert.deepEqual(readers.getTradeHistory(account), [item]);
  readers.saveTradeHistoryItem(account, { ...item, hash: fill.maker });
  assert.equal(readers.getTradeHistory(account).length, 1);
});
