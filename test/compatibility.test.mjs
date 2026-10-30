import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('compatibility terminal starts without financial claims or synthetic position/card code', () => {
  const html = readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
  for (const id of ['live-block', 'stt-balance', 'wallet-usdso', 'margin-unlocked', 'btc-mark', 'best-bid', 'best-ask']) {
    assert.match(html, new RegExp(`id="${id}">—</dd>`));
  }
  assert.match(html, /Positions unavailable — not an empty-position claim/);
  assert.match(html, /Historical execution evidence/);
  assert.doesNotMatch(html, /ENTRY_PRICE|POSITION_SIZE|renderCard|5\.2x|198\.00|89\.96/);
});
