import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCandles, hourly24hChange } from '../src/lib/data/candles.ts';
import { positiveDecimal, validateOrderInput } from '../src/lib/math/orderInput.ts';

const candle = {
  bucketStart: '1793190300',
  intervalSeconds: 60,
  openPrice: '81042300000000000000000',
  high: '90000000000000000000000',
  low: '81039100000000000000000',
  closePrice: '81064400000000000000000',
  baseVolume: '769905000',
};
test('native candle normalization preserves the observed 90,000 wick and market volume units', () => {
  const [btc] = normalizeCandles([candle], 60, 8, 18);
  assert.equal(btc.high, 90000);
  assert.equal(btc.open, 81042.3);
  assert.equal(btc.volume, 7.69905);
  assert.equal(
    normalizeCandles([{ ...candle, baseVolume: '2000000000000000000' }], 60, 18, 18)[0].volume,
    2
  );
});
test('timestamps are ascending and identical duplicates do not double-count volume', () => {
  const result = normalizeCandles(
    [{ ...candle, bucketStart: '1793190360' }, candle, candle],
    60,
    8,
    18
  );
  assert.equal(result.length, 2);
  assert.equal(result[0].time, 1793190300);
  assert.equal(result[0].volume, 7.69905);
});
test('mixed intervals, invalid OHLC, millisecond timestamps and conflicting duplicates are rejected', () => {
  for (const invalid of [
    { ...candle, intervalSeconds: 300 },
    { ...candle, high: '1' },
    { ...candle, bucketStart: '1793190300000' },
    { ...candle, low: 'NaN' },
  ])
    assert.throws(() => normalizeCandles([invalid], 60, 8, 18));
  assert.throws(() => normalizeCandles([candle, { ...candle, baseVolume: '1' }], 60, 8, 18));
  assert.deepEqual(normalizeCandles([], 60, 8, 18), []);
});
const order = {
  quantity: '0.00013',
  limitPrice: '81000.1',
  margin: '3',
  orderType: 'limit',
  baseDecimals: 8,
  quoteDecimals: 18,
  minQuantity: '0.00013',
  lotSize: '0.00001',
  tickSize: '0.1',
};
test('24h change requires completed hourly closes exactly one day apart and current coverage', () => {
  const now = 1793190335;
  const end = Math.floor(now / 3600) * 3600 - 3600;
  const bar = (time, close) => ({ time, open: close, high: close, low: close, close, volume: 1 });
  const snapshot = [bar(end - 86400, 80000), bar(end, 81000)];
  assert.equal(hourly24hChange(snapshot, now), 1.25);
  assert.equal(hourly24hChange([bar(end - 3600, 80000), bar(end, 81000)], now), null);
  assert.equal(hourly24hChange(snapshot, now + 3600), null);
  assert.equal(hourly24hChange([bar(end - 86400, 0), bar(end, 81000)], now), null);
  assert.equal(hourly24hChange([bar(end - 86400, 80000), bar(end + 3600, 82000)], now), null);
});
test('blank, negative, exponent and non-finite financial inputs never become valid orders', () => {
  for (const value of ['', '-', '.', '-1', '0', '1e4', 'NaN', 'Infinity', '1,5', '1'.repeat(400)]) {
    assert.equal(positiveDecimal(value), null);
    assert.ok(validateOrderInput({ ...order, quantity: value }));
  }
  assert.equal(validateOrderInput(order), null);
});
test('limit price cannot silently fall back to mark; lot, tick and base precision are validated', () => {
  assert.equal(validateOrderInput({ ...order, limitPrice: '' }).field, 'price');
  assert.equal(validateOrderInput({ ...order, limitPrice: '81000.15' }).field, 'price');
  assert.equal(validateOrderInput({ ...order, quantity: '0.000131' }).field, 'quantity');
  assert.equal(validateOrderInput({ ...order, quantity: '0.000130001' }).field, 'quantity');
  assert.equal(validateOrderInput({ ...order, margin: '' }).field, 'margin');
  assert.equal(validateOrderInput({ ...order, orderType: 'market', limitPrice: '' }), null);
});
