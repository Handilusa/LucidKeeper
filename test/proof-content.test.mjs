import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROJECT, PROOF, PENDING_PROOF_CLOSES } from '../src/content/project.ts';

const hash = '0x9be2d311c11b274a49d75000d694f664e2fc9076ea74584b39b338a42f3f049e';

test('historical AVAX proof carries only verified execution figures and scoped product attribution', () => {
  const avax = PROOF.find(record => record.hash === hash);
  assert.ok(avax);
  assert.equal(PROJECT.account, '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA');
  assert.equal(avax.value, '4.8 AVAX');
  for (const text of ['31 Oct 2026 18:26:46 UTC', 'IOC orderType=2', 'fully filled at 8.588 USDso',
    '41.2224 USDso notional (not margin)', 'zero remaining quantity',
    'Owner-confirmed execution through the current product flow',
    'independently verified read-only by receipt, fill, account events and a later position snapshot'])
    assert.ok(avax.detail.includes(text), text);
  assert.doesNotMatch(avax.detail, /profit|PnL|fee/i);
});

test('AVAX and DOGE closes stay pending without new hashes or relabeled historical BTC evidence', () => {
  assert.deepEqual(PENDING_PROOF_CLOSES, ['AVAX', 'DOGE']);
  assert.equal(PROOF.filter(record => /close/i.test(record.label)).length, 1);
  const btc = PROOF.find(record => record.label === 'Earlier BTC close');
  assert.equal(btc.hash, '0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6');
  assert.match(btc.detail, /neither the AVAX close nor the DOGE close/);
  assert.match(PROOF.find(record => record.value === '120 DOGE').detail, /FOK execution; owner-relayed/);
  for (const file of ['README.md', 'SUBMISSION_TODO.md']) {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const market of PENDING_PROOF_CLOSES) assert.ok(content.includes(`${market} close — pending`), `${file}: ${market}`);
    assert.ok(content.includes(`${PROJECT.explorer}/tx/${hash}`));
    assert.ok(content.includes('41.2224 USDso notional (not margin)'));
  }
});
