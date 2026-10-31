import { ALL_VERIFIED_PERP_MARKETS } from './markets';
import { normalizeCandles, hourly24hChange, type ChartCandle } from './candles';
import { createGraphqlReader } from './readResilience';
import { observationArray, observationRecord, observationText, observationHex, observationBoolean,
  observationUint, observationUnits, observationInteger, observationTimestamp } from './observations';
export type { ChartCandle } from './candles';

export const INDEXER_GRAPHQL_URL = 'https://hideki-dev.smk.somnia.host/v1/graphql';
const indexerReads = createGraphqlReader(INDEXER_GRAPHQL_URL);

export interface MarketInfo {
  id: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  poolAddress: string;
  marginBank: string;
  minQuantity: string;
  tickSize: string;
  lotSize: string;
}

export interface TradeHistoryItem {
  id: string;
  hash: string;
  type: 'order' | 'deposit' | 'withdraw' | 'close' | 'approve';
  marketSymbol?: string;
  side?: 'buy' | 'sell';
  size?: number;
  price?: number;
  amountUsdso?: number;
  blockNumber?: number;
  timestamp: number;
  description: string;
  source?: 'indexer' | 'rpc_fallback' | 'cache';
}

export interface ActiveOrderItem {
  id: string;
  orderId: string;
  poolAddress: string;
  marketSymbol: string;
  isBid: boolean;
  side: 'buy' | 'sell';
  price: number;
  fullQuantity: number;
  quantityRemaining: number;
  placedAtTimestamp: number;
  placedTxHash: string;
  status: string;
}

function observedMarket(pool: unknown) {
  const address = observationHex(pool, 20, 'Market pool');
  const market = ALL_VERIFIED_PERP_MARKETS.find((m) => m.poolAddress.toLowerCase() === address.toLowerCase());
  if (!market) throw new Error('Market units unavailable: unknown pool');
  return market;
}

function historyObservations(data: unknown, account: string): TradeHistoryItem[] {
  const response = observationRecord(data, 'History');
  const fills = observationArray(response.Fill, 'Fill');
  const marginEvents = observationArray(response.MarginEvent, 'MarginEvent');
  const items: TradeHistoryItem[] = [];
  for (const row of fills) {
    const f = observationRecord(row, 'Fill');
    const taker = observationHex(f.taker, 20, 'Fill taker').toLowerCase();
    const maker = observationHex(f.maker, 20, 'Fill maker').toLowerCase();
    if (taker !== account && maker !== account) continue;
    const market = observedMarket(f.pool);
    const takerIsBid = observationBoolean(f.takerIsBid, 'Fill side');
    const isBuy = taker === account ? takerIsBid : !takerIsBid;
    const size = observationUnits(f.quantity, market.baseDecimals, 'Fill quantity');
    const price = observationUnits(f.fillPrice, market.quoteDecimals, 'Fill price');
    items.push({
      id: `fill-${observationText(f.id, 'Fill id')}`,
      hash: observationHex(f.txHash, 32, 'Fill hash'),
      type: 'order', marketSymbol: market.baseSymbol, side: isBuy ? 'buy' : 'sell', size, price,
      blockNumber: observationInteger(f.blockNumber, 'Fill block'),
      timestamp: observationTimestamp(f.timestamp, 'Fill timestamp'),
      description: `OrderFilled: ${isBuy ? 'Long' : 'Short'} ${size} ${market.baseSymbol} @ $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
      source: 'indexer',
    });
  }
  for (const row of marginEvents) {
    const m = observationRecord(row, 'MarginEvent');
    if (observationHex(m.account, 20, 'Margin account').toLowerCase() !== account) continue;
    const kind = observationText(m.kind, 'Margin kind');
    const isDeposit = /deposit/i.test(kind);
    if (!isDeposit && !/withdraw/i.test(kind)) continue; // Internal lock/unlock bookkeeping.
    const amount = observationUnits(m.amount, 18, 'Margin amount');
    items.push({
      id: `margin-${observationText(m.id, 'Margin id')}`,
      hash: observationHex(m.txHash, 32, 'Margin hash'),
      type: isDeposit ? 'deposit' : 'withdraw', amountUsdso: amount,
      blockNumber: observationInteger(m.blockNumber, 'Margin block'),
      timestamp: observationTimestamp(m.timestamp, 'Margin timestamp'),
      description: `Margin ${isDeposit ? 'Deposit' : 'Withdrawal'}: ${amount.toFixed(2)} USDso`,
      source: 'indexer',
    });
  }
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Fetch real OHLCV candlestick data directly from dreamDEX GraphQL Indexer.
 */
export async function fetchMarketCandles(
  poolAddress: string,
  intervalSeconds: number = 3600,
  limit: number = 300
): Promise<ChartCandle[]> {
  const market = ALL_VERIFIED_PERP_MARKETS.find(
    (m) => m.poolAddress.toLowerCase() === poolAddress.toLowerCase()
  );
  if (!market) throw new Error('Unknown market decimals');
  const query = `
    query Candles($pool: String!, $limit: Int, $interval: Int!) {
      Candle(
        where: { pool: { _eq: $pool }, intervalSeconds: { _eq: $interval } }
        order_by: [{ bucketStart: desc }]
        limit: $limit
      ) {
        bucketStart
        intervalSeconds
        openPrice
        high
        low
        closePrice
        baseVolume
        quoteVolume
        tradeCount
        lastFillId
      }
    }
  `;

  const json = await indexerReads.read(query, { pool: poolAddress.toLowerCase(), limit, interval: intervalSeconds }, 5000);
  if (json.errors?.length) throw new Error('Candle indexer returned an error');
  const rawCandles = json?.data?.Candle;
  if (!Array.isArray(rawCandles)) throw new Error('Missing candle response');
  return normalizeCandles(rawCandles, intervalSeconds, market.baseDecimals, market.quoteDecimals);
}

/**
 * Hourly 24h snapshot, not a rolling ticker. Require the last completed hour
 * and its close 24 hours earlier; sparse or outdated coverage is unavailable.
 */
export async function fetchMarket24hChange(poolAddress: string): Promise<number | null> {
  const market = ALL_VERIFIED_PERP_MARKETS.find(
    (m) => m.poolAddress.toLowerCase() === poolAddress.toLowerCase()
  );
  if (!market) return null;
  const query = `
    query Market24hStats($pool: String!) {
      Candle(
        where: { pool: { _eq: $pool }, intervalSeconds: { _eq: 3600 } }
        order_by: [{ bucketStart: desc }]
        limit: 26
      ) {
        bucketStart
        intervalSeconds
        openPrice
        high
        low
        closePrice
        baseVolume
      }
    }
  `;

  try {
    const json = await indexerReads.read(query, { pool: poolAddress.toLowerCase() }, 15000);
    if (json.errors?.length || !Array.isArray(json?.data?.Candle)) return null;
    const candles = normalizeCandles(
      json.data.Candle,
      3600,
      market.baseDecimals,
      market.quoteDecimals
    );
    return hourly24hChange(candles, Date.now() / 1000);
  } catch (error) {
    console.warn('[Indexer] Could not fetch 24h change:', error);
    return null;
  }
}

/**
 * Fetch real on-chain trade and margin history for a connected account.
 * Queries GraphQL Fill (with taker/maker _or) and MarginEvent.
 */
export async function fetchUserTradeHistory(
  account: string,
  limit: number = 30,
  offset: number = 0
): Promise<TradeHistoryItem[]> {
  if (!account) return [];
  const normalizedAccount = account.toLowerCase();
  // Old transformed caches may contain defaulted values; retain them but never read them.
  const cacheKey = `lucidkeeper_cache_trades_v2_50383_${normalizedAccount}_${limit}_${offset}`;

  const query = `
    query UserTradeHistory($account: String!, $limit: Int!, $offset: Int!) {
      Fill(
        where: {
          _or: [
            { taker: { _eq: $account } }
            { maker: { _eq: $account } }
          ]
        }
        order_by: [{ timestamp: desc }]
        limit: $limit
        offset: $offset
      ) {
        id
        txHash
        blockNumber
        timestamp
        pool
        fillPrice
        quantity
        quoteQuantity
        taker
        maker
        takerIsBid
      }
      MarginEvent(
        where: { account: { _eq: $account } }
        order_by: [{ timestamp: desc }]
        limit: $limit
        offset: $offset
      ) {
        id
        txHash
        blockNumber
        timestamp
        account
        amount
        kind
        pool
      }
    }
  `;

  try {
    const json = await indexerReads.read(query, { account: normalizedAccount, limit, offset });
    if (json.errors?.length) {
      console.warn('[Indexer] GraphQL trade history error:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL query error');
    }

    const items = historyObservations(json.data, normalizedAccount);

    // Update transient cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          cacheKey,
          JSON.stringify({ observedAt: Date.now(), data: json.data })
        );
      } catch {
        // Ignore cache storage errors
      }
    }

    return items;
  } catch (err) {
    console.warn('[Indexer] Falling back for trade history:', err);
    // Return cached items if available
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Number.isFinite(parsed.observedAt) && Date.now() >= parsed.observedAt && Date.now() - parsed.observedAt <= 300000) {
            const items = historyObservations(parsed.data, normalizedAccount);
            if (items.length) return items.map((item) => ({ ...item, source: 'cache' }));
          }
        }
      } catch {
        // Ignore
      }
    }
    throw err;
  }
}

/**
 * Fetch resting limit orders for an account from dreamDEX GraphQL Indexer.
 */
export async function fetchUserActiveOrders(account: string): Promise<ActiveOrderItem[]> {
  if (!account) return [];
  const normalizedAccount = account.toLowerCase();

  const query = `
    query UserActiveOrders($account: String!) {
      Order(
        where: {
          owner: { _eq: $account }
          quantityRemaining: { _gt: "0" }
          status: { _nin: ["Cancelled", "Filled"] }
        }
        order_by: [{ placedAtTimestamp: desc }]
        limit: 50
      ) {
        id
        orderId
        owner
        pool
        isBid
        side
        price
        fullQuantity
        quantityRemaining
        placedTxHash
        placedAtTimestamp
        status
      }
    }
  `;

  try {
    // Deduplicate only while in flight; cancellation preflight never reuses a TTL snapshot.
    const json = await indexerReads.read(query, { account: normalizedAccount });
    if (json.errors?.length || !Array.isArray(json?.data?.Order))
      throw new Error('Active orders response unavailable');
    const rawOrders = json.data.Order;

    const activeOrders: ActiveOrderItem[] = [];
    for (const row of rawOrders) {
      const o = observationRecord(row, 'Order');
      if (observationHex(o.owner, 20, 'Order owner').toLowerCase() !== normalizedAccount) continue;
      const market = observedMarket(o.pool);
      const fullQty = observationUnits(o.fullQuantity, market.baseDecimals, 'Order full quantity');
      const remainingQty = observationUnits(o.quantityRemaining, market.baseDecimals, 'Order remaining quantity');
      const price = observationUnits(o.price, market.quoteDecimals, 'Order price');
      const isBid = observationBoolean(o.isBid, 'Order side');

      activeOrders.push({
        id: observationText(o.id, 'Order id'),
        orderId: observationUint(o.orderId, 'Order number').toString(),
        poolAddress: market.poolAddress,
        marketSymbol: market.baseSymbol,
        isBid,
        side: isBid ? 'buy' : 'sell',
        price,
        fullQuantity: fullQty,
        quantityRemaining: remainingQty,
        placedAtTimestamp: observationTimestamp(o.placedAtTimestamp, 'Order timestamp'),
        placedTxHash: observationHex(o.placedTxHash, 32, 'Order hash'),
        status: observationText(o.status, 'Order status'),
      });
    }

    return activeOrders;
  } catch (err) {
    console.warn('[Indexer] Could not fetch active orders:', err);
    throw err;
  }
}

/**
 * Query 21 perp markets directly from verified Somnia Tokyo parameters.
 */
export async function fetchPerpMarkets(): Promise<MarketInfo[]> {
  return ALL_VERIFIED_PERP_MARKETS;
}
