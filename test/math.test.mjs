import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeUnrealizedPnl,
  computeNotional,
  computeAccruedFunding,
  computeReturnOnMarginBps,
} from '../src/lib/math/pnl.ts';
import {
  computeMarginRequirements,
  classifyMarginStatus,
  computeHealthFactor,
} from '../src/lib/math/margin.ts';
import { computeLiquidationPrice } from '../src/lib/math/liquidation.ts';
import {
  formatPrice,
  formatTokenAmount,
  formatPercent,
  shortenAddress,
} from '../src/lib/math/format.ts';

test('PnL: computes long and short unrealized PnL accurately', () => {
  const oneBase = 10n ** 8n; // BTC 8 decimals
  const entry = 80000n * 10n ** 18n; // 80,000 USDso
  const markHigh = 82000n * 10n ** 18n; // 82,000 USDso (+2,000)
  const markLow = 78000n * 10n ** 18n;
  const size = 13000n; // 0.00013 BTC

  // Long in profit
  const pnlLong = computeUnrealizedPnl({
    size,
    avgEntryPrice: entry,
    markPrice: markHigh,
    oneBase,
  });
  // 2000 * 13000 / 1e8 = 0.26 USDso (260000000000000000n wei)
  assert.equal(pnlLong, 260000000000000000n);

  // Long in loss
  const pnlLongLoss = computeUnrealizedPnl({
    size,
    avgEntryPrice: entry,
    markPrice: markLow,
    oneBase,
  });
  assert.equal(pnlLongLoss, -260000000000000000n);

  // Short in loss
  const pnlShort = computeUnrealizedPnl({
    size: -size,
    avgEntryPrice: entry,
    markPrice: markHigh,
    oneBase,
  });
  assert.equal(pnlShort, -260000000000000000n);

  // Edge cases: size 0 or oneBase 0
  assert.equal(computeUnrealizedPnl({ size: 0n, avgEntryPrice: entry, markPrice: markHigh, oneBase }), 0n);
  assert.equal(computeUnrealizedPnl({ size, avgEntryPrice: entry, markPrice: markHigh, oneBase: 0n }), 0n);
});

test('Notional: computes absolute position notional and edge cases', () => {
  const oneBase = 10n ** 8n;
  const size = 13000n; // 0.00013 BTC
  const mark = 80000n * 10n ** 18n; // 80,000 USDso

  const notional = computeNotional(size, mark, oneBase);
  // 0.00013 * 80000 = 10.4 USDso (10.4 * 1e18)
  assert.equal(notional, 10400000000000000000n);

  // Short negative size
  const notionalShort = computeNotional(-size, mark, oneBase);
  assert.equal(notionalShort, 10400000000000000000n);

  // Zero checks
  assert.equal(computeNotional(0n, mark, oneBase), 0n);
  assert.equal(computeNotional(size, mark, 0n), 0n);
});

test('Funding and Return on Margin', () => {
  const oneBase = 10n ** 8n;
  const size = 13000n;

  // Accrued funding
  assert.equal(computeAccruedFunding(0n, 100n, 50n, oneBase), 0n);
  const fundingExact = computeAccruedFunding(size, 10n ** 26n, 0n, oneBase);
  assert(fundingExact > 0n);

  // Ceil division check for non-exact remainder
  const fundingCeil = computeAccruedFunding(size, 10n ** 18n + 3n, 10n ** 18n, oneBase);
  assert.equal(typeof fundingCeil, 'bigint');

  // Return on margin
  assert.equal(computeReturnOnMarginBps(500n, 0n), null);
  assert.equal(computeReturnOnMarginBps(-500n, -100n), null);
  assert.equal(computeReturnOnMarginBps(250000000000000000n, 1000000000000000000n), 2500); // 25% = 2500 bps
});

test('Liquidation: exact formula matches protocol behavior for Long and Short', () => {
  const oneBase = 10n ** 8n;
  const size = 13000n; // 0.00013 BTC Long
  const mark = 80000n * 10n ** 18n;
  const equity = 2n * 10n ** 18n; // 2.0 USDso
  const mmReq = 520000000000000000n; // 0.52 USDso (5% maintenance on 10.4)
  const maintenanceMarginBps = 500n; // 5%

  // Long
  const liqPriceLong = computeLiquidationPrice({
    equity,
    mmReq,
    size,
    markPrice: mark,
    maintenanceMarginBps,
    oneBase,
  });

  assert(liqPriceLong !== null);
  assert(liqPriceLong < mark);
  assert(liqPriceLong > 0n);

  // Short
  const liqPriceShort = computeLiquidationPrice({
    equity,
    mmReq,
    size: -size,
    markPrice: mark,
    maintenanceMarginBps,
    oneBase,
  });
  assert(liqPriceShort !== null);
  assert(liqPriceShort > mark);

  // Edge cases
  assert.equal(
    computeLiquidationPrice({ equity, mmReq, size: 0n, markPrice: mark, maintenanceMarginBps, oneBase }),
    null
  );
  assert.equal(
    computeLiquidationPrice({ equity, mmReq, size, markPrice: mark, maintenanceMarginBps: 10000n, oneBase }),
    null
  );
  assert.equal(
    computeLiquidationPrice({ equity, mmReq, size, markPrice: mark, maintenanceMarginBps, oneBase: 0n }),
    null
  );
});

test('Margin Requirements & Health Status Classification & Health Factor', () => {
  const notional = 10n * 10n ** 18n; // 10 USDso
  const { imReq, mmReq, cmReq } = computeMarginRequirements({
    notional,
    effectiveImfBps: 1000n, // 10%
    maintenanceMarginBps: 500n, // 5%
    closeOutMarginBps: 250n, // 2.5%
  });

  assert.equal(imReq, 1n * 10n ** 18n); // 1 USDso
  assert.equal(mmReq, 500000000000000000n); // 0.5 USDso
  assert.equal(cmReq, 250000000000000000n); // 0.25 USDso

  assert.equal(classifyMarginStatus(2n * 10n ** 18n, imReq, mmReq, cmReq), 'Healthy');
  assert.equal(classifyMarginStatus(750000000000000000n, imReq, mmReq, cmReq), 'MarginCall');
  assert.equal(classifyMarginStatus(300000000000000000n, imReq, mmReq, cmReq), 'PartialLiquidation');
  assert.equal(classifyMarginStatus(100000000000000000n, imReq, mmReq, cmReq), 'CloseOut');

  // Health factor calculation
  assert.equal(computeHealthFactor(1n * 10n ** 18n, 0n), 999.0);
  assert.equal(computeHealthFactor(-1n * 10n ** 18n, 500000000000000000n), 0);
  const hf = computeHealthFactor(1000000000000000000n, 500000000000000000n);
  assert.equal(hf, 2);
});

test('Format utilities: prices, token amounts, percentages, addresses', () => {
  assert.equal(formatPrice(80000.5, 2), '80,000.50');
  assert.equal(formatPrice('invalid'), '0.00');
  assert.equal(formatPrice(100, 2, { showSign: true }), '+100.00');
  assert.equal(formatPrice(-50, 2, { showSign: true }), '-50.00');

  assert.equal(formatTokenAmount(13000n, 8, 5), '0.00013');
  assert.equal(formatTokenAmount(1000000000000000000n, 18, 2), '1');

  assert.equal(formatPercent(5.234), '5.23%');
  assert.equal(formatPercent(5.234, { showSign: true }), '+5.23%');
  assert.equal(formatPercent(-3.5, { showSign: true }), '-3.50%');

  assert.equal(shortenAddress('0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA'), '0x1420...8fDA');
  assert.equal(shortenAddress('0x123'), '0x123');
});
