import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { MARGIN_HOLD, assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

test('funding hold rejects approvals, deposits and orders that could auto-pull margin', () => {
  assert.equal(MARGIN_HOLD.active, true);
  for (const action of ['approve', 'deposit', 'order']) {
    assert.throws(() => assertOnchainActionAllowed(action), /HOLD/);
  }
  assert.throws(() => assertOnchainActionAllowed('transfer'), /outside the bounty allowlist/);
});

test('preparation CLIs stop before argument parsing, network reads or new evidence', () => {
  const directory = new URL('../evidence/', import.meta.url);
  const before = readdirSync(directory).sort();
  for (const script of ['prepare-margin.mjs', 'prepare-order.mjs']) {
    // Deliberately invalid flags: the HOLD must be the first check, before even
    // parsing input. No EOA transaction is encoded or evidence written here.
    const result = spawnSync(process.execPath, [`scripts/${script}`, '--release-hold'], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 10_000,
    });
    assert.ifError(result.error);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /HOLD:/);
    assert.doesNotMatch(result.stderr, /Unknown option|Connectivity failed/);
    assert.equal(result.stdout, '');
  }
  assert.deepEqual(readdirSync(directory).sort(), before);
});
