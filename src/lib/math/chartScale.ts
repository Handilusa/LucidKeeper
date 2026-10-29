import type { ChartCandle } from '../data/candles';

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** View-only range. Every body is included; unusual wicks remain in the source series. */
export function robustCandleScale(candles: readonly ChartCandle[], mark = 0) {
  if (!candles.length) return null;
  const center = median(candles.map(c => c.close));
  const mad = median(candles.map(c => Math.abs(c.close - center)));
  const typicalRange = median(candles.map(c => c.high - c.low));
  const radius = Math.max(mad * 6, typicalRange * 4, center * 0.002);
  const lower = Math.min(center - radius, ...candles.map(c => Math.min(c.open, c.close)));
  const upper = Math.max(center + radius, ...candles.map(c => Math.max(c.open, c.close)));
  // Include ordinary wicks and the live reference; never change OHLC values.
  let minValue = Math.min(...candles.map(c => c.low >= lower ? c.low : Math.min(c.open, c.close)));
  let maxValue = Math.max(...candles.map(c => c.high <= upper ? c.high : Math.max(c.open, c.close)));
  if (mark > 0 && Number.isFinite(mark)) {
    minValue = Math.min(minValue, mark);
    maxValue = Math.max(maxValue, mark);
  }
  const padding = Math.max((maxValue - minValue) * 0.08, center * 0.0005);
  const priceRange = { minValue: Math.max(0, minValue - padding), maxValue: maxValue + padding };
  const outliers = candles.filter(c => c.low < priceRange.minValue || c.high > priceRange.maxValue).length;
  return { priceRange, outliers };
}
