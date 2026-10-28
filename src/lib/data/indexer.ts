import { ALL_VERIFIED_PERP_MARKETS } from './markets';

export const INDEXER_GRAPHQL_URL = 'https://hideki-dev.smk.somnia.host/v1/graphql';

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

export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
 * Aggregate fine-grained candles into a coarser interval.
 */
function aggregateCandles(candles: ChartCandle[], intervalSeconds: number): ChartCandle[] {
  if (intervalSeconds <= 0 || candles.length === 0) return candles;

  const buckets = new Map<number, ChartCandle>();

  for (const c of candles) {
    const bucket = Math.floor(c.time / intervalSeconds) * intervalSeconds;
    const existing = buckets.get(bucket);
    if (!existing) {
      buckets.set(bucket, { time: bucket, open: c.open, high: c.high, low: c.low, close: c.close, volume: c.volume });
    } else {
      existing.high = Math.max(existing.high, c.high);
      existing.low = Math.min(existing.low, c.low);
      existing.close = c.close;
      existing.volume += c.volume;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

/**
 * Fetch real OHLCV candlestick data directly from dreamDEX GraphQL Indexer.
 */
export async function fetchMarketCandles(
  poolAddress: string,
  intervalSeconds: number = 3600,
  limit: number = 300
): Promise<ChartCandle[]> {
  const query = `
    query Candles($pool: String!, $limit: Int) {
      Candle(
        where: { pool: { _eq: $pool } }
        order_by: [{ bucketStart: desc }]
        limit: $limit
      ) {
        bucketStart
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

  try {
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          pool: poolAddress.toLowerCase(),
          limit: 2000,
        },
      }),
    });

    const json = await res.json();
    const rawCandles = json?.data?.Candle;

    if (!rawCandles || rawCandles.length === 0) {
      return [];
    }

    const sorted = [...rawCandles].sort(
      (a, b) => parseInt(a.bucketStart, 10) - parseInt(b.bucketStart, 10)
    );

    const baseCandles = sorted.map((c) => ({
      time: Math.floor(parseInt(c.bucketStart, 10)),
      open: parseFloat(c.openPrice) / 1e18,
      high: parseFloat(c.high) / 1e18,
      low: parseFloat(c.low) / 1e18,
      close: parseFloat(c.closePrice) / 1e18,
      volume: parseFloat(c.baseVolume) / 1e8,
    }));

    const nativeBucket = baseCandles.length >= 2
      ? baseCandles[1].time - baseCandles[0].time
      : 60;

    const aggregated = intervalSeconds > nativeBucket
      ? aggregateCandles(baseCandles, intervalSeconds)
      : baseCandles;

    return aggregated.slice(-limit);
  } catch (error) {
    console.warn('[Indexer] Could not fetch candles from indexer:', error);
    return [];
  }
}

/**
 * Fetch real rolling 24h price change percentage from dreamDEX GraphQL Indexer.
 * Uses 1-hour candles (intervalSeconds: 3600) to find the oldest candle in the 24h window.
 */
export async function fetchMarket24hChange(poolAddress: string): Promise<number | null> {
  const query = `
    query Market24hStats($pool: String!) {
      Candle(
        where: { pool: { _eq: $pool }, intervalSeconds: { _eq: 3600 } }
        order_by: [{ bucketStart: desc }]
        limit: 25
      ) {
        bucketStart
        openPrice
        closePrice
      }
    }
  `;

  try {
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          pool: poolAddress.toLowerCase(),
        },
      }),
    });

    const json = await res.json();
    const candles = json?.data?.Candle;

    if (!candles || candles.length < 2) {
      return null;
    }

    const latest = candles[0];
    const oldest = candles[candles.length - 1];
    const latestClose = parseFloat(latest.closePrice) / 1e18;
    const oldestOpen = parseFloat(oldest.openPrice) / 1e18;

    if (oldestOpen <= 0) return null;
    return ((latestClose - oldestOpen) / oldestOpen) * 100;
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
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: {
          account: normalizedAccount,
          limit,
          offset,
        },
      }),
    });

    if (!res.ok) {
      throw new Error(`Indexer responded with HTTP ${res.status}`);
    }

    const json = await res.json();
    if (json.errors) {
      console.warn('[Indexer] GraphQL trade history error:', json.errors);
      throw new Error(json.errors[0]?.message || 'GraphQL query error');
    }

    const items: TradeHistoryItem[] = [];

    // 1. Process Fills
    const fills = json?.data?.Fill || [];
    for (const f of fills) {
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
        localStorage.setItem(`lucidkeeper_cache_trades_${normalizedAccount}`, JSON.stringify(items));
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
        const cached = localStorage.getItem(`lucidkeeper_cache_trades_${normalizedAccount}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: TradeHistoryItem) => ({ ...item, source: 'cache' }));
          }
        }
      } catch {
        // Ignore
      }
    }
    return [];
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
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { account: normalizedAccount },
      }),
    });

    if (!res.ok) throw new Error(`Indexer responded with HTTP ${res.status}`);
    const json = await res.json();
    const rawOrders = json?.data?.Order || [];

    const activeOrders: ActiveOrderItem[] = [];
    for (const o of rawOrders) {
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
    return [];
  }
}

/**
 * Query 21 perp markets directly from verified Somnia Tokyo parameters.
 */
export async function fetchPerpMarkets(): Promise<MarketInfo[]> {
  return ALL_VERIFIED_PERP_MARKETS;
}
