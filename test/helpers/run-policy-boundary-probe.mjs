import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

export function runPolicyBoundaryProbe(mode, script) {
  const result = spawnSync(process.execPath, ['test/helpers/policy-boundary-probe.mjs', mode, ...(script ? [script] : [])], {
    cwd: new URL('../../', import.meta.url), encoding: 'utf8', timeout: 30_000,
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout.trim());
  assert.equal(report.mode, mode);
  assert.equal(report.held, mode !== 'absent-foreign');
  assert.equal(report.context.chainId, 50383);
  for (const count of Object.values(report.rejectedCallCounts)) assert.equal(count, 0);
  return report;
}
