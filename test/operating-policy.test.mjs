import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { MARGIN_HOLD, assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

test('hold released: approved actions pass; unknown actions still rejected', () => {
  assert.equal(MARGIN_HOLD.active, false);
  for (const action of ['approve', 'deposit', 'order']) {
    assert.doesNotThrow(() => assertOnchainActionAllowed(action));
  }
  assert.throws(() => assertOnchainActionAllowed('transfer'), /outside the bounty allowlist/);
});

test('preparation CLIs proceed past hold and fail on missing arguments or connectivity', () => {
  const directory = new URL('../evidence/', import.meta.url);
  const before = readdirSync(directory).sort();
  for (const script of ['prepare-margin.mjs', 'prepare-order.mjs']) {
    const result = spawnSync(process.execPath, [`scripts/${script}`], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15_000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, `${script} should fail without required arguments`);
    // The HOLD is released, so the error should not be about HOLD.
    assert.doesNotMatch(result.stderr, /HOLD:/);
  }
  assert.deepEqual(readdirSync(directory).sort(), before);
});
