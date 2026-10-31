import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { MARGIN_HOLD, AUTHORIZED_SIGNER, assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';
import { capture } from './fixtures/captured.mjs';
import { runPolicyBoundaryProbe } from './helpers/run-policy-boundary-probe.mjs';

test('written margin release permits only explicit bounty EOA/Tokyo context', () => {
  assert.equal(MARGIN_HOLD.active, false);
  assert.equal(MARGIN_HOLD.releasedFor, capture.account.address);
  assert.equal(AUTHORIZED_SIGNER, capture.account.address);
  assert.equal(MARGIN_HOLD.chainId, capture.provenance.network.chainId);
  assert.equal(Object.isFrozen(MARGIN_HOLD), true);
  for (const action of ['approve', 'deposit', 'order']) {
    const context = { chainId: MARGIN_HOLD.chainId, wallet: capture.account.address };
    assert.doesNotThrow(() => assertOnchainActionAllowed(action, context));
    assert.doesNotThrow(() => assertOnchainActionAllowed(action, { ...context, wallet: context.wallet.toLowerCase() }));
    for (const invalid of [undefined, {}, { ...context, wallet: undefined }, { ...context, wallet: null }, { ...context, wallet: 1 }, { ...context, wallet: capture.system.marginBank }, { ...context, chainId: undefined }, { ...context, chainId: String(context.chainId) }, { ...context, chainId: 0 }]) {
      // Invalid boundary mutations/real contract address, not fabricated wallets or RPC.
      assert.throws(() => assertOnchainActionAllowed(action, invalid), /Only the authorized bounty EOA/);
    }
  }
  for (const action of ['transfer', 'cancel', 'withdraw', 'limit', 'claim', 'signMessage'])
    assert.throws(() => assertOnchainActionAllowed(action, { chainId: MARGIN_HOLD.chainId, wallet: capture.account.address }), /outside the bounty allowlist/);
});

test('browser write entry points use product review/lifetime rules, not agent policy', () => {
  for (const path of ['trade/TradingBox', 'portfolio/PositionsTable', 'margin/MarginHubModal', 'sentinel/RiskGuardian']) {
    const source = readFileSync(new URL(`../src/features/${path}.tsx`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /assertOnchainActionAllowed|operating-policy/);
    assert.match(source, /lifetime\.assert\(/);
    assert.match(source, /reviewBrowserWrite\(/);
  }
  const source = readFileSync(new URL('../src/lib/browser-policy.ts', import.meta.url), 'utf8');
  for (const field of ['chainId', 'from', 'to', 'value', 'data', 'nonce', 'gas', 'fees', 'description', 'market', 'size']) assert.match(source, new RegExp(`\\b${field}\\b`));
  assert.match(source, /window\.confirm/);
  assert.doesNotMatch(source, /process\.env|privateKeyToAccount|signTransaction/);
});

test('incomplete preparation CLIs remain fail-closed before network or evidence writes', () => {
  const directory = new URL('../evidence/', import.meta.url);
  const before = readdirSync(directory).sort();
  for (const script of ['prepare-margin.mjs', 'prepare-order.mjs', 'prepare-close-order.mjs']) {
    const result = spawnSync(process.execPath, [`scripts/${script}`], {
      cwd: new URL('../', import.meta.url), encoding: 'utf8', timeout: 15_000,
    });
    assert.ifError(result.error);
    assert.notEqual(result.status, 0, `${script} should fail without required arguments`);
    assert.match(result.stderr, /Only the authorized bounty EOA/);
  }
  assert.deepEqual(readdirSync(directory).sort(), before);
});

test('restored HOLD rejects preparation CLIs with bounty EOA arguments before transport or evidence writes', () => {
  for (const script of ['prepare-margin.mjs', 'prepare-order.mjs', 'prepare-close-order.mjs'])
    runPolicyBoundaryProbe('cli-hold', script);
});
