import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PROJECT, PROOF, PENDING_PROOF_CLOSES, VERIFIED_PROOF_CLOSES } from '../src/content/project.ts';

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

test('verified closes replace pending gates without relabeling the historical BTC or DOGE opening', () => {
  assert.deepEqual(PENDING_PROOF_CLOSES, []);
  assert.equal(PROOF.filter(record => /close/i.test(record.label)).length, 4);
  const btc = PROOF.find(record => record.label === 'Earlier BTC close');
  assert.equal(btc.hash, '0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6');
  assert.match(btc.detail, /neither the AVAX close nor the DOGE close/);
  assert.match(PROOF.find(record => record.value === '120 DOGE').detail, /FOK execution; owner-relayed/);
  for (const file of ['README.md', 'SUBMISSION_TODO.md']) {
    const content = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
    for (const market of ['AVAX', 'DOGE']) {
      assert.ok(content.includes(`${market} close — verified`), `${file}: ${market}`);
      assert.ok(!content.includes(`${market} close — pending`), `${file}: obsolete ${market} gate`);
    }
    assert.ok(content.includes(`${PROJECT.explorer}/tx/${hash}`));
    assert.ok(content.includes('41.2224 USDso notional (not margin)'));
  }
});

test('three close records retain verified IOC fills, flat snapshots and only their own hashes', () => {
  const expected = [
    ['BTC', '0.00093 BTC', '20:39:52', '77,654.2', '72.218406', '0x948dc39bc4e32e0a5f6246b50d243813ea42cc6c398c9a7c746c1b8af027b0b4'],
    ['DOGE', '120 DOGE', '20:40:11', '0.07574', '9.0888', '0xb7ae27d709d13cdea7bba3dac928b5392865b0852e6835081a401fd62d32311e'],
    ['AVAX', '4.8 AVAX', '20:40:30', '8.565', '41.112', '0xae9b6862f47f9e27a4f4cfa335e4b9cde4ff44018dea33a289a901237b3e8b34'],
  ];
  assert.equal(VERIFIED_PROOF_CLOSES.length, 3);
  for (const [i, [market, value, time, price, notional, tx]] of expected.entries()) {
    const record = VERIFIED_PROOF_CLOSES[i];
    assert.equal(record.market, market); assert.equal(record.value, value); assert.equal(record.hash, tx);
    assert.ok(PROOF.includes(record));
    for (const literal of [`31 Oct 2026 ${time} UTC`, 'IOC orderType=2', `${price} USDso`,
      `${notional} USDso notional (not margin)`, 'Fully filled', 'zero order remainder and zero position after close',
      'Independently verified read-only', 'snapshot block 38261043']) assert.ok(record.detail.includes(literal), `${market}: ${literal}`);
    assert.doesNotMatch(record.detail, /profit|PnL|fee/i);
    for (const file of ['README.md', 'SUBMISSION_TODO.md', 'docs/audit/013-owner-reported-three-closes.md'])
      assert.ok(readFileSync(new URL(`../${file}`, import.meta.url), 'utf8').includes(`${PROJECT.explorer}/tx/${tx}`));
  }
  const audit = readFileSync(new URL('../docs/audit/013-owner-reported-three-closes.md', import.meta.url), 'utf8');
  for (const pnl of ['−0.742233', '−0.0588', '−0.1104']) assert.ok(audit.includes(pnl));
  assert.ok(audit.includes('not net after funding, trading fees or STT gas'));
});
