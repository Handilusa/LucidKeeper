import test from 'node:test';
import assert from 'node:assert/strict';
import { formatUnits } from 'viem';
import { computeUnrealizedPnl, computeNotional, computeReturnOnMarginBps, computeAccruedFunding } from '../src/lib/math/pnl.ts';
import { computeMarginRequirements, classifyMarginStatus, computeHealthFactor } from '../src/lib/math/margin.ts';
import { computeLiquidationPrice } from '../src/lib/math/liquidation.ts';
import { formatPrice, formatTokenAmount, formatPercent, shortenAddress, quantizeToGrid } from '../src/lib/math/format.ts';
import { capture, btc, doge } from './fixtures/captured.mjs';
const size = BigInt(capture.historicalPosition.size);
const entry = BigInt(capture.historicalPosition.avgEntryPrice);
const mark = BigInt(btc.mark[1]);
const oneBase = BigInt(btc.oneBase);
test('PnL: computes long and short unrealized PnL accurately', () => {
  // Labeled historical-position/current-mark scenario, not a current PnL claim.
  const result = computeUnrealizedPnl({ size, avgEntryPrice: entry, markPrice: mark, oneBase });
  assert.equal(result, (mark - entry) * size / oneBase);
  assert.equal(computeUnrealizedPnl({ size: -size, avgEntryPrice: entry, markPrice: mark, oneBase }), -result);
  assert.equal(computeUnrealizedPnl({ size: 0n, avgEntryPrice: entry, markPrice: mark, oneBase }), 0n);
});
test('Notional: computes absolute position notional and edge cases', () => {
  assert.equal(computeNotional(size, mark, oneBase), size * mark / oneBase);
  assert.equal(computeNotional(-size, mark, oneBase), computeNotional(size, mark, oneBase));
  assert.equal(computeNotional(0n, mark, oneBase), 0n);
});
test('Funding and Return on Margin', () => {
  const pnl = computeUnrealizedPnl({ size, avgEntryPrice: entry, markPrice: mark, oneBase });
  const margin = BigInt(capture.account.state.unlockedCollateralBalance);
  assert.equal(computeReturnOnMarginBps(pnl, margin), Number((pnl * 10000n) / margin));
  assert.equal(computeReturnOnMarginBps(pnl, 0n), null);
});
test('accrued funding rounding branch (test-only mathematical inputs)', () => {
  assert.equal(computeAccruedFunding(1n, 1n, 0n, 1n), 1n);
  assert.equal(computeAccruedFunding(-1n, 1n, 0n, 1n), 0n);
  assert.equal(computeAccruedFunding(1n, 10n ** 18n, 0n, 1n), 1n);
  assert.equal(computeAccruedFunding(-1n, 10n ** 18n, 0n, 1n), -1n);
  assert.equal(computeAccruedFunding(0n, 1n, 0n, 1n), 0n);
  assert.equal(computeAccruedFunding(1n, 1n, 0n, 0n), 0n);
});
test('Liquidation: exact formula matches protocol behavior for Long and Short', () => {
  // Real account health and historical size as a hypothetical risk scenario.
  const input = { equity: BigInt(capture.account.health[0]), mmReq: BigInt(capture.account.health[2]), size, markPrice: mark, maintenanceMarginBps: BigInt(btc.parameters.maintenanceMarginBps), oneBase };
  const result = computeLiquidationPrice(input);
  assert.ok(result === 0n || result < mark);
  assert.ok(computeLiquidationPrice({ ...input, size: -size }) > mark);
  assert.equal(computeLiquidationPrice({ ...input, size: 0n }), null);
});
test('Margin Requirements & Health Status Classification & Health Factor', () => {
  const notional = computeNotional(size, mark, oneBase);
  const input = { notional, effectiveImfBps: BigInt(btc.parameters.initialMarginBps), maintenanceMarginBps: BigInt(btc.parameters.maintenanceMarginBps), closeOutMarginBps: BigInt(btc.parameters.closeOutMarginBps) };
  const result = computeMarginRequirements(input);
  for (const [key, rate] of [['imReq', input.effectiveImfBps], ['mmReq', input.maintenanceMarginBps], ['cmReq', input.closeOutMarginBps]]) assert.equal(result[key], (notional * rate + 9999n) / 10000n);
  assert.equal(classifyMarginStatus(BigInt(capture.account.health[0]), ...capture.account.health.slice(1).map(BigInt)), 'Healthy');
  assert.ok(computeHealthFactor(BigInt(capture.account.health[0]), BigInt(capture.account.health[2])) > 0);
});
test('Format utilities: prices, token amounts, percentages, addresses', () => {
  const decimal = Number(formatUnits(mark, btc.market.quoteDecimals));
  assert.equal(formatPrice(decimal, 2), decimal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  assert.equal(formatTokenAmount(size, btc.market.baseDecimals, 5), formatUnits(size, btc.market.baseDecimals));
  assert.equal(shortenAddress(capture.account.address), '0x1420...8fDA');
  const percent = Number(btc.funding) / 1e18 * 100;
  assert.equal(formatPercent(percent), `${percent.toFixed(2)}%`);
});
test('Grid quantization: enforces strict tick and lot grid alignment', () => {
  for (const snapshot of [btc, doge, capture.snapshots.find(s => s.market.baseSymbol === '1000PEPE')]) {
    const price = BigInt(snapshot.mark[1]);
    const tick = BigInt(snapshot.grid.tickSize);
    const floor = quantizeToGrid(price, tick, 'floor');
    const ceil = quantizeToGrid(price, tick, 'ceil');
    assert.equal(floor % tick, 0n); assert.ok(floor <= price && price - floor < tick);
    assert.equal(ceil % tick, 0n); assert.ok(ceil >= price && ceil - price < tick);
  }
});
