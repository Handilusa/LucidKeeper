import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { closeQuantity, positionByPool } from '../src/lib/math/close.ts';
import { capture, btc } from './fixtures/captured.mjs';
const history = capture.positionHistory;
test('partial close rejects genuinely closed, changed and flipped historical BTC positions', () => {
  const original = BigInt(history[0].position.size);
  const lot = BigInt(btc.grid.lotSize);
  assert.equal(closeQuantity(original, original, 50, lot), original / 2n / lot * lot);
  for (const later of history.slice(1)) if (BigInt(later.position.size) !== original)
    assert.throws(() => closeQuantity(original, BigInt(later.position.size), 50, lot), /Position changed/);
  const short = BigInt(history.find(p => BigInt(p.position.size) < 0n).position.size);
  assert.equal(closeQuantity(short, short, 100, lot), -short);
  assert.throws(() => closeQuantity(BigInt(capture.account.position.size), BigInt(capture.account.position.size), 100, lot));
});
test('dialog identity resolves latest real position, not an old retained snapshot', () => {
  const initial = { poolAddress: btc.market.poolAddress, ...history[0].position };
  const latest = { poolAddress: btc.market.poolAddress, ...history.find(p => p.position.size === '99000').position };
  assert.equal(positionByPool([latest], initial.poolAddress), latest);
  assert.notEqual(positionByPool([latest], initial.poolAddress), initial);
  assert.equal(positionByPool([], initial.poolAddress), null);
});
test('close UI stores only pool identity and rechecks the raw position after review', () => {
  const source = readFileSync(new URL('../src/features/portfolio/PositionsTable.tsx', import.meta.url), 'utf8');
  assert.match(source, /positionByPool\(positions, closePool\)/);
  assert.doesNotMatch(source, /setClosePosition|parseUnits\(pos\.size/);
  assert.match(source, /closeQuantity\(current\.size, finalPosition\.size/);
});
