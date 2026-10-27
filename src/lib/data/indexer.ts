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

/**
 * Fetch real OHLCV candlestick data directly from dreamDEX GraphQL Indexer.
 * Returns chart-ready items formatted for TradingView Lightweight Charts.
 */
/**
 * Aggregate fine-grained candles into a coarser interval.
 * Groups input candles (sorted ascending) by floor(time / intervalSeconds) * intervalSeconds.
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
      existing.close = c.close; // candles arrive ascending, last one is close
      existing.volume += c.volume;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

export async function fetchMarketCandles(
  poolAddress: string,
  intervalSeconds: number = 3600,
  limit: number = 300
): Promise<ChartCandle[]> {
  // Fetch the finest granularity available (up to 2000 raw candles so aggregation has material)
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
          limit: 2000, // fetch as many raw candles as possible for aggregation
        },
      }),
    });

    const json = await res.json();
    const rawCandles = json?.data?.Candle;

    if (!rawCandles || rawCandles.length === 0) {
      return [];
    }

    // Sort ascending by bucketStart (oldest first for TradingView)
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

    // Detect native bucket size from the first two candles
    const nativeBucket = baseCandles.length >= 2
      ? baseCandles[1].time - baseCandles[0].time
      : 60;

    // Only aggregate if the requested interval is larger than the native bucket
    const aggregated = intervalSeconds > nativeBucket
      ? aggregateCandles(baseCandles, intervalSeconds)
      : baseCandles;

    // Return at most `limit` candles (most recent)
    return aggregated.slice(-limit);
  } catch (error) {
    console.warn('[Indexer] Could not fetch candles from indexer:', error);
    return [];
  }
}

/**
 * Query 21 perp markets directly from the official GraphQL indexer.
 */
export async function fetchPerpMarkets(): Promise<MarketInfo[]> {
  const query = `
    query GetPerpMarkets {
      perpMarkets(limit: 50) {
        id
        baseSymbol
        quoteSymbol
        baseDecimals
        quoteDecimals
        poolAddress
        marginBank
        minQuantity
        tickSize
        lotSize
      }
    }
  `;

  try {
    const res = await fetch(INDEXER_GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    const json = await res.json();
    if (json?.data?.perpMarkets && json.data.perpMarkets.length > 0) {
      return json.data.perpMarkets;
    }
  } catch (err) {
    console.warn('[Indexer] Error fetching perp markets:', err);
  }

  // Fallback verified BTC perp pool if indexer is temporarily unreachable
  return [
    {
      id: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
      baseSymbol: 'BTC',
      quoteSymbol: 'USDso',
      baseDecimals: 8,
      quoteDecimals: 18,
      poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
      marginBank: '0x478769E1177C0773c43A593DCCc4Ad15F15F1394',
      minQuantity: '0.00013',
      tickSize: '0.1',
      lotSize: '0.00001',
    },
  ];
}
