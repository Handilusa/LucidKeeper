import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCandles, hourly24hChange } from '../src/lib/data/candles.ts';
import { positiveDecimal, validateOrderInput } from '../src/lib/math/orderInput.ts';
import { capture, btc, orderInput } from './fixtures/captured.mjs';
import { formatUnits } from 'viem';
const rows = capture.candles.result.data.Candle;
const candle = rows[0];
const order = { quantity: orderInput.quantity, limitPrice: orderInput.price, margin: formatUnits(BigInt(capture.account.state.unlockedCollateralBalance), 18), orderType: 'limit', baseDecimals: btc.market.baseDecimals, quoteDecimals: btc.market.quoteDecimals, minQuantity: formatUnits(BigInt(btc.grid.minQuantity), btc.market.baseDecimals), lotSize: formatUnits(BigInt(btc.grid.lotSize), btc.market.baseDecimals), tickSize: formatUnits(BigInt(btc.grid.tickSize), btc.market.quoteDecimals) };
test('native candle normalization preserves captured OHLC and market volume units', () => {
  const [bar] = normalizeCandles([candle], 3600, btc.market.baseDecimals, btc.market.quoteDecimals);
  assert.equal(bar.high, Number(candle.high) / 1e18);
  assert.equal(bar.open, Number(candle.openPrice) / 1e18);
  assert.equal(bar.volume, Number(candle.baseVolume) / Number(btc.oneBase));
});
test('timestamps are ascending and identical duplicates do not double-count volume', () => {
  const result = normalizeCandles([...rows, ...rows], 3600, btc.market.baseDecimals, btc.market.quoteDecimals);
  assert.equal(result.length, rows.length);
  for (let i = 1; i < result.length; i++) assert.ok(result[i].time > result[i - 1].time);
});
test('mixed intervals, invalid OHLC, millisecond timestamps and conflicting duplicates are rejected', () => {
  // Deliberately malformed input mutations, not fabricated financial responses.
  for (const invalid of [{ ...candle, intervalSeconds: -1 }, { ...candle, high: '-1' }, { ...candle, bucketStart: `${candle.bucketStart}000` }, { ...candle, low: 'NaN' }]) assert.throws(() => normalizeCandles([invalid], 3600, btc.market.baseDecimals, btc.market.quoteDecimals));
  assert.throws(() => normalizeCandles([candle, { ...candle, baseVolume: '-1' }], 3600, btc.market.baseDecimals, btc.market.quoteDecimals));
});
test('24h change requires completed hourly closes exactly one day apart and current coverage', () => {
  const bars = normalizeCandles(rows, 3600, btc.market.baseDecimals, btc.market.quoteDecimals);
  const now = bars.at(-1).time + 3600;
  const earlier = bars.find(bar => bar.time === bars.at(-1).time - 86400);
  assert.ok(earlier);
  assert.ok(Math.abs(hourly24hChange(bars, now) - (bars.at(-1).close / earlier.close - 1) * 100) < 1e-12);
  assert.equal(hourly24hChange(bars.slice(-2), now), null);
  assert.equal(hourly24hChange(bars, now + 3600), null);
});
test('blank, negative, exponent and non-finite financial inputs never become valid orders', () => {
  for (const value of ['', '-', '.', '-1', '0', '1e4', 'NaN', 'Infinity']) { assert.equal(positiveDecimal(value), null); assert.ok(validateOrderInput({ ...order, quantity: value })); }
  assert.equal(validateOrderInput(order), null);
});
test('limit price cannot silently fall back to mark; lot, tick and base precision are validated', () => {
  assert.equal(validateOrderInput({ ...order, limitPrice: '' }).field, 'price');
  assert.equal(validateOrderInput({ ...order, quantity: `${order.quantity}1` }).field, 'quantity');
  assert.equal(validateOrderInput({ ...order, orderType: 'market', limitPrice: '' }), null);
});
