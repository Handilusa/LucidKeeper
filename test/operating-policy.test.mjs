import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { MARGIN_HOLD, assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

test('conditional owner authorization never overrides the active HOLD', () => {
  assert.equal(MARGIN_HOLD.active, true);
  for (const action of ['approve', 'deposit', 'order']) {
    assert.throws(() => assertOnchainActionAllowed(action), /HOLD:/);
  }
  assert.throws(() => assertOnchainActionAllowed('transfer'), /outside the bounty allowlist/);
});

test('every browser write entry point imports the shared hard-stop and review rules', () => {
  for (const path of ['trade/TradingBox', 'portfolio/PositionsTable', 'margin/MarginHubModal', 'sentinel/RiskGuardian']) {
    const source = readFileSync(new URL(`../src/features/${path}.tsx`, import.meta.url), 'utf8');
    assert.match(source, /assertOnchainActionAllowed\(/);
    assert.match(source, /reviewBrowserWrite\(/);
  }
  const source = readFileSync(new URL('../src/lib/browser-policy.ts', import.meta.url), 'utf8');
  for (const field of ['chainId', 'from', 'to', 'value', 'data', 'nonce', 'gas', 'fees', 'description', 'market', 'size']) assert.match(source, new RegExp(`\\b${field}\\b`));
  assert.match(source, /window\.confirm/);
  assert.doesNotMatch(source, /process\.env|privateKeyToAccount|signTransaction/);
});

test('all preparation CLIs stop at HOLD before arguments, network or evidence writes', () => {
  const directory = new URL('../evidence/', import.meta.url);
  const before = readdirSync(directory).sort();
  for (const script of ['prepare-margin.mjs', 'prepare-order.mjs', 'prepare-close-order.mjs']) {
    const result = spawnSync(process.execPath, [`scripts/${script}`], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15_000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, `${script} should fail without required arguments`);
    assert.match(result.stderr, /HOLD:/);
  }
  assert.deepEqual(readdirSync(directory).sort(), before);
});
