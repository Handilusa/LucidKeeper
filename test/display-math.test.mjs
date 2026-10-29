import test from 'node:test';
import assert from 'node:assert/strict';
import { sizingLiquidation, normalizedFunding8h } from '../src/lib/math/preview.ts';
import { computeLiquidationPrice } from '../src/lib/math/liquidation.ts';
import { robustCandleScale } from '../src/lib/math/chartScale.ts';
import { readDisplay } from '../src/lib/data/readDisplay.ts';
import { formatDynamicPrice } from '../src/lib/math/format.ts';

const scenario = { price: 80000, quantity: .001, leverage: 10, isLong: true, maintenanceBps: 250, feeRate: 0 };
test('standalone long and short liquidation solve equity = maintenance, including entry fees', () => {
  for (const isLong of [true, false]) for (const feeRate of [0, .001]) {
    const price = sizingLiquidation({ ...scenario, isLong, feeRate });
    const equity = 80 / 10 - 80 * feeRate + (price - 80000) * .001 * (isLong ? 1 : -1);
    assert.ok(Math.abs(equity - price * .001 * .025) < 1e-10);
    assert.equal(price < scenario.price, isLong);
  }
  assert.ok(sizingLiquidation({ ...scenario, leverage: 20 }) > sizingLiquidation(scenario));
  // Quantity scales the scenario's margin and maintenance equally, so its price is invariant.
  assert.ok(Math.abs(sizingLiquidation({ ...scenario, quantity: .01 }) - sizingLiquidation(scenario)) < 1e-8);
});
test('zero, invalid inputs and fully funded long have explicit outcomes', () => {
  assert.equal(sizingLiquidation({ ...scenario, leverage: 1 }), 0);
  assert.ok(sizingLiquidation({ ...scenario, leverage: 1, isLong: false }) > 80000);
  for (const invalid of [{ quantity: 0 }, { quantity: -1 }, { price: NaN }, { price: 0 }, { leverage: 0 }, { maintenanceBps: 10000 }, { feeRate: -1 }, { quantity: Infinity }])
    assert.equal(sizingLiquidation({ ...scenario, ...invalid }), null);
});
test('portfolio liquidation uses total health, differs from sizing scenario and handles flat accounts', () => {
  const inputs = { equity: 12n * 10n**18n, mmReq: 1n * 10n**18n, size: 20000n, markPrice: 81000n * 10n**18n, maintenanceMarginBps: 300n, oneBase: 10n**8n };
  const liquidation = computeLiquidationPrice(inputs);
  assert.ok(liquidation > 0n && liquidation < inputs.markPrice);
  assert.ok(computeLiquidationPrice({ ...inputs, size: -20000n }) > inputs.markPrice);
  assert.equal(computeLiquidationPrice({ ...inputs, size: 0n }), null);
});
test('funding uses calculation window rather than settlement interval or an assumed eight hours', () => {
  assert.equal(normalizedFunding8h(1365132819918171n, 28800n), .001365132819918171);
  assert.equal(normalizedFunding8h(100000000000000n, 14400n), .0002);
  assert.equal(normalizedFunding8h(-100000000000000n, 57600n), -.00005);
  assert.equal(normalizedFunding8h(0n, 28800n), 0);
  assert.equal(normalizedFunding8h(1n, 0n), null);
});
test('balance display retains cached zero/nonzero on failure, expires and recovers', () => {
  assert.deepEqual(readDisplay(12, 100, true, 120, 30), { value: 12, updatedAt: 100, stale: true });
  assert.equal(readDisplay(0, 100, true, 120, 30).value, 0);
  assert.equal(readDisplay(12, 100, false, 130, 30).stale, true);
  assert.equal(readDisplay(12, 140, false, 145, 30).stale, false);
  assert.equal(readDisplay(undefined, 0, false, 120, 30).value, null);
});
test('robust scaling preserves execution OHLC and all bodies, discloses candles, and supports tiny prices', () => {
  const bars = Array.from({ length: 30 }, (_, time) => ({ time, open: 81000, close: 81005, low: 80990, high: time === 29 ? 90000 : 81010, volume: 1 }));
  const original = structuredClone(bars);
  const result = robustCandleScale(bars, 81200);
  assert.equal(result.outliers, 1);
  assert.ok(result.priceRange.maxValue >= 81200 && result.priceRange.maxValue < 90000);
  assert.deepEqual(bars, original);
  bars[29].close = bars[29].open = 90000;
  assert.ok(robustCandleScale(bars).priceRange.maxValue >= 90000);
  assert.equal(robustCandleScale([]), null);
  const tiny = original.map(b => ({ ...b, open: b.open / 1e10, close: b.close / 1e10, low: b.low / 1e10, high: b.high / 1e10 }));
  assert.equal(robustCandleScale(tiny).outliers, 1);
  assert.ok(Number(formatDynamicPrice(.0000000123)) > 0);
});
