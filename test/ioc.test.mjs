import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { iocPrice } from '../src/lib/math/ioc.ts';
import { capture } from './fixtures/captured.mjs';

test('1000PEPE IOC matches exact on-chain arithmetic at real block 37084078', () => {
  const { regression } = capture;
  assert.equal(regression.block.number, '37084078');
  assert.equal(regression.mark[0], true);
  const mark = BigInt(regression.mark[1]);
  const tick = BigInt(regression.grid.tickSize);
  assert.equal(mark, 5205531797000000n);
  assert.equal(iocPrice(mark, tick, false), 5101400000000000n);
  assert.equal(iocPrice(mark, tick, true), 5309600000000000n);
});
test('IOC integer multiplication/division/tick floor agrees for all 21 captured markets', () => {
  for (const snapshot of capture.snapshots) {
    const mark = BigInt(snapshot.mark[1]);
    const tick = BigInt(snapshot.grid.tickSize);
    for (const bid of [false, true]) {
      const price = iocPrice(mark, tick, bid);
      assert.equal(price, (mark * (bid ? 102n : 98n) / 100n) / tick * tick);
      assert.equal(price % tick, 0n);
    }
  }
  assert.throws(() => iocPrice(0n, BigInt(capture.regression.grid.tickSize), true));
});
test('trade, close and Guardian execution use the shared raw-price helper', () => {
  for (const path of ['trade/TradingBox', 'portfolio/PositionsTable', 'sentinel/RiskGuardian']) {
    const source = readFileSync(new URL(`../src/features/${path}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /iocPrice\(/);
    assert.doesNotMatch(source, /quoteDecimals\s*>\s*6\s*\?\s*6\s*:\s*2/);
  }
});
