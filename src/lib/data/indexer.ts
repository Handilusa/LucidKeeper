import { ALL_VERIFIED_PERP_MARKETS } from './markets';
import { normalizeCandles, hourly24hChange, type ChartCandle } from './candles';
import { createGraphqlReader } from './readResilience';
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
    if (json.errors) {
      console.warn('[Indexer] GraphQL trade history error:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL query error');
    }

    const items: TradeHistoryItem[] = [];

    // 1. Process Fills
    const fills = json?.data?.Fill || [];
    for (const f of fills) {
      if (f.taker?.toLowerCase() !== normalizedAccount && f.maker?.toLowerCase() !== normalizedAccount) continue;
      const market = ALL_VERIFIED_PERP_MARKETS.find(
        (m) => m.poolAddress.toLowerCase() === f.pool?.toLowerCase()
      );
      const isTaker = f.taker.toLowerCase() === normalizedAccount;
      const isBuy = isTaker ? Boolean(f.takerIsBid) : !f.takerIsBid;
      const baseDecimals = market?.baseDecimals || 8;
      const size = Number(BigInt(f.quantity || '0')) / 10 ** baseDecimals;
      const price = Number(BigInt(f.fillPrice || '0')) / 1e18;
      const symbol = market?.baseSymbol || 'PERP';
      const blockNum = f.blockNumber ? parseInt(f.blockNumber, 10) : undefined;
      // Indexer timestamp is in seconds (or ns if huge)
      const rawTs = parseInt(f.timestamp || '0', 10);
      const timestampMs = rawTs > 1e12 ? rawTs : rawTs * 1000;

      items.push({
        id: `fill-${f.id}`,
        hash: f.txHash,
        type: 'order',
        marketSymbol: symbol,
        side: isBuy ? 'buy' : 'sell',
        size,
        price,
        blockNumber: blockNum,
        timestamp: timestampMs,
        description: `OrderFilled: ${isBuy ? 'Long' : 'Short'} ${size} ${symbol} @ $${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`,
        source: 'indexer',
      });
    }

    // 2. Process Margin Events (filtering out internal lock/unlock bookkeeping to highlight deposits/withdrawals)
    const marginEvents = json?.data?.MarginEvent || [];
    for (const m of marginEvents) {
      if (m.account?.toLowerCase() !== normalizedAccount) continue;
      const kindStr = String(m.kind || '');
      const isDeposit = /deposit/i.test(kindStr);
      const isWithdraw = /withdraw/i.test(kindStr);

      // Only display user-facing Margin actions
      if (isDeposit || isWithdraw) {
        const amt = Number(BigInt(m.amount || '0')) / 1e18;
        const blockNum = m.blockNumber ? parseInt(m.blockNumber, 10) : undefined;
        const rawTs = parseInt(m.timestamp || '0', 10);
        const timestampMs = rawTs > 1e12 ? rawTs : rawTs * 1000;

        items.push({
          id: `margin-${m.id}`,
          hash: m.txHash,
          type: isDeposit ? 'deposit' : 'withdraw',
          amountUsdso: amt,
          blockNumber: blockNum,
          timestamp: timestampMs,
          description: `Margin ${isDeposit ? 'Deposit' : 'Withdrawal'}: ${amt.toFixed(2)} USDso`,
          source: 'indexer',
        });
      }
    }

    // Sort descending by timestamp
    items.sort((a, b) => b.timestamp - a.timestamp);

    // Update transient cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `lucidkeeper_cache_trades_50383_${normalizedAccount}_${limit}_${offset}`,
          JSON.stringify({ observedAt: Date.now(), items })
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
        const cached = localStorage.getItem(
          `lucidkeeper_cache_trades_50383_${normalizedAccount}_${limit}_${offset}`
        );
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Number.isFinite(parsed.observedAt) && Date.now() >= parsed.observedAt && Date.now() - parsed.observedAt <= 300000 && Array.isArray(parsed.items) && parsed.items.length > 0) {
            return parsed.items.map((item: TradeHistoryItem) => ({ ...item, source: 'cache' }));
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
    for (const o of rawOrders) {
      if (o.owner?.toLowerCase() !== normalizedAccount) continue;
      // Order ID is often pool_orderId or pool address in id
      let poolAddr = o.pool;
      if (!poolAddr && o.id && o.id.includes('_')) {
        poolAddr = o.id.split('_')[0];
      }

      const market = ALL_VERIFIED_PERP_MARKETS.find(
        (m) => m.poolAddress.toLowerCase() === (poolAddr || '').toLowerCase()
      );
      const baseDecimals = market?.baseDecimals || 8;
      const fullQty = Number(BigInt(o.fullQuantity || '0')) / 10 ** baseDecimals;
      const remainingQty = Number(BigInt(o.quantityRemaining || '0')) / 10 ** baseDecimals;
      const price = Number(BigInt(o.price || '0')) / 1e18;
      const rawTs = parseInt(o.placedAtTimestamp || '0', 10);
      const timestampMs = rawTs > 1e12 ? rawTs : rawTs * 1000;

      activeOrders.push({
        id: o.id,
        orderId: o.orderId,
        poolAddress: poolAddr || market?.poolAddress || '',
        marketSymbol: market?.baseSymbol || 'PERP',
        isBid: Boolean(o.isBid),
        side: o.isBid ? 'buy' : 'sell',
        price,
        fullQuantity: fullQty,
        quantityRemaining: remainingQty,
        placedAtTimestamp: timestampMs,
        placedTxHash: o.placedTxHash || '',
        status: o.status,
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
