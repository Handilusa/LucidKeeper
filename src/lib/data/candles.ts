export interface ChartCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface RawCandle {
  bucketStart: string;
  intervalSeconds: number;
  openPrice: string;
  high: string;
  low: string;
  closePrice: string;
  baseVolume: string;
}

/** Hourly snapshot: two completed execution candle closes exactly 24h apart. */
export function hourly24hChange(candles: ChartCandle[], nowSeconds: number): number | null {
  const end = Math.floor(nowSeconds / 3600) * 3600 - 3600;
  const latest = candles.find((candle) => candle.time === end);
  const previous = candles.find((candle) => candle.time === end - 86400);
  if (
    !latest ||
    !previous ||
    !Number.isFinite(latest.close) ||
    !Number.isFinite(previous.close) ||
    latest.close <= 0 ||
    previous.close <= 0
  )
    return null;
  const change = ((latest.close - previous.close) / previous.close) * 100;
  return Number.isFinite(change) ? change : null;
}

/** Native execution OHLC only. Valid extreme prices must never be clipped. */
export function normalizeCandles(
  rows: RawCandle[],
  interval: number,
  baseDecimals: number,
  quoteDecimals: number
): ChartCandle[] {
  const byTime = new Map<number, ChartCandle>();
  for (const row of rows) {
    if (Number(row.intervalSeconds) !== interval)
      throw new Error('Indexer returned a different candle interval');
    const candle = {
      time: Number(row.bucketStart),
      open: Number(row.openPrice) / 10 ** quoteDecimals,
      high: Number(row.high) / 10 ** quoteDecimals,
      low: Number(row.low) / 10 ** quoteDecimals,
      close: Number(row.closePrice) / 10 ** quoteDecimals,
      volume: Number(row.baseVolume) / 10 ** baseDecimals,
    };
    if (
      !Object.values(candle).every(Number.isFinite) ||
      !Number.isSafeInteger(candle.time) ||
      candle.time <= 0 ||
      candle.time >= 100000000000 ||
      candle.time % interval !== 0 ||
      candle.low <= 0 ||
      candle.volume < 0 ||
      candle.high < Math.max(candle.open, candle.close) ||
      candle.low > Math.min(candle.open, candle.close) ||
      candle.high < candle.low
    )
      throw new Error('Indexer returned invalid OHLC or timestamps');
    const existing = byTime.get(candle.time);
    if (existing && JSON.stringify(existing) !== JSON.stringify(candle))
      throw new Error('Indexer returned conflicting candles for one timestamp');
    byTime.set(candle.time, candle);
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}
