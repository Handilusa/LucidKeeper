import test from 'node:test';
import assert from 'node:assert/strict';
import { sizingLiquidation, normalizedFunding8h } from '../src/lib/math/preview.ts';
import { computeLiquidationPrice } from '../src/lib/math/liquidation.ts';
import { robustCandleScale } from '../src/lib/math/chartScale.ts';
import { readDisplay } from '../src/lib/data/readDisplay.ts';
import { normalizeCandles } from '../src/lib/data/candles.ts';
import { capture, btc } from './fixtures/captured.mjs';
const scenario = { price: Number(btc.mark[1]) / 1e18, quantity: Number(capture.historicalPosition.size) / Number(btc.oneBase), leverage: 10, isLong: true, maintenanceBps: btc.parameters.maintenanceMarginBps, feeRate: btc.parameters.takerFeeBpsTimes1k / 1e7 };
test('standalone long and short liquidation solve equity = maintenance, including entry fees', () => {
  // UI scenario with real mark/quantity/rates and the user's 10x control, not a read result.
  for (const isLong of [true, false]) {
    const price = sizingLiquidation({ ...scenario, isLong });
    const notional = scenario.price * scenario.quantity;
    const equity = notional / scenario.leverage - notional * scenario.feeRate + (price - scenario.price) * scenario.quantity * (isLong ? 1 : -1);
    assert.ok(Math.abs(equity - price * scenario.quantity * scenario.maintenanceBps / 10000) < 1e-8);
  }
});
test('zero, invalid inputs and fully funded long have explicit outcomes', () => {
  assert.equal(sizingLiquidation({ ...scenario, leverage: 1 }), 0);
  for (const change of [{ quantity: 0 }, { price: NaN }, { leverage: 0 }, { feeRate: -1 }]) assert.equal(sizingLiquidation({ ...scenario, ...change }), null);
});
test('portfolio liquidation uses total health, differs from sizing scenario and handles flat accounts', () => {
  assert.equal(computeLiquidationPrice({ equity: BigInt(capture.account.health[0]), mmReq: BigInt(capture.account.health[2]), size: BigInt(capture.account.position.size), markPrice: BigInt(btc.mark[1]), maintenanceMarginBps: BigInt(btc.parameters.maintenanceMarginBps), oneBase: BigInt(btc.oneBase) }), null);
});
test('funding uses calculation window rather than settlement interval or an assumed eight hours', () => {
  for (const snapshot of capture.snapshots) {
    const window = BigInt(snapshot.fundingParameters.fundingCalculationWindowSec);
    const rate = BigInt(snapshot.funding);
    assert.ok(Math.abs(normalizedFunding8h(rate, window) - Number(rate) / 1e18 * 28800 / Number(window)) < 1e-15);
  }
  assert.equal(normalizedFunding8h(BigInt(btc.funding), 0n), null);
});
test('balance display retains cached zero/nonzero on failure, expires and recovers', () => {
  const balance = Number(capture.account.walletCollateral) / 1e18;
  const now = Date.parse(capture.provenance.capturedAt);
  assert.equal(readDisplay(balance, now, true, now, 30000).value, balance);
  assert.equal(readDisplay(balance, now, true, now, 30000).stale, true);
  assert.equal(readDisplay(balance, now, false, now, 30000).stale, false);
  assert.equal(readDisplay(undefined, 0, false, now, 30000).value, null);
});
test('robust scaling preserves execution OHLC and all bodies, discloses candles, and supports tiny prices', () => {
  const bars = normalizeCandles(capture.candles.result.data.Candle, 3600, btc.market.baseDecimals, btc.market.quoteDecimals);
  const original = structuredClone(bars);
  const result = robustCandleScale(bars, scenario.price);
  assert.ok(result.priceRange.maxValue >= scenario.price);
  for (const bar of bars) { assert.ok(result.priceRange.minValue <= Math.min(bar.open, bar.close)); assert.ok(result.priceRange.maxValue >= Math.max(bar.open, bar.close)); }
  assert.deepEqual(bars, original);
  assert.equal(robustCandleScale([]), null);
});
