import assert from 'node:assert/strict';
import { Session } from 'node:inspector/promises';
import { registerHooks } from 'node:module';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

// Isolated child-process policy-state injection only. Production exports/gates,
// transports, filesystem functions, financial captures and RPC are not replaced.
const [mode, script] = process.argv.slice(2);
const held = mode === 'hold' || mode === 'cli-hold';
const policyUrl = new URL('../../src/lib/operating-policy.mjs', import.meta.url).href;
let injections = 0;
if (held) registerHooks({
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (url !== policyUrl) return result;
    const source = String(result.source);
    assert.equal(source.split('active: false,').length, 2, 'Expected the single production policy-state declaration');
    injections++;
    return { ...result, source: source.replace('active: false,', 'active: true,') };
  },
});

const { createPublicClient, http } = await import('viem');
const { sendRawTransaction } = await import('viem/actions');
const { saveEvidence } = await import('../../src/lib/dreamdex.mjs');
const { broadcastSignedTransaction, TOKYO_RPC } = await import('../../src/lib/broadcast.mjs');
const { MARGIN_HOLD, assertOnchainActionAllowed } = await import('../../src/lib/operating-policy.mjs');
const { capture, historicalEnvelope } = await import('../fixtures/captured.mjs');

// Native debugger function-entry observations. These are real functions, not
// stubs/spies that replace a dependency. No synthetic network/send result exists.
const functions = { createPublicClient, http, saveEvidence, sendRawTransaction, mkdir, writeFile };
const counts = Object.fromEntries(Object.keys(functions).map(name => [name, 0]));
const session = new Session();
session.connect();
const breakpoints = new Map();
session.on('Debugger.paused', ({ params }) => {
  for (const breakpoint of params.hitBreakpoints ?? []) {
    const name = breakpoints.get(breakpoint);
    if (name) counts[name]++;
  }
  // Resume immediately; observe calls without changing their arguments/results.
  session.post('Debugger.resume').catch(error => { throw error; });
});
globalThis.__lucidkeeperPolicyProbeFunctions = functions;
try {
  await session.post('Debugger.enable');
  for (const name of Object.keys(functions)) {
    const { result } = await session.post('Runtime.evaluate', { expression: `globalThis.__lucidkeeperPolicyProbeFunctions.${name}` });
    assert.ok(result.objectId, `Missing real function handle: ${name}`);
    const { breakpointId } = await session.post('Debugger.setBreakpointOnFunctionCall', { objectId: result.objectId });
    breakpoints.set(breakpointId, name);
  }

  // Positive controls exercise real local creation/writing, never an RPC request.
  // Invalid Symbol filename enters the real evidence function but cannot write
  // an evidence file. A separate owned Git-metadata file calibrates writeFile,
  // avoiding races with other tests' evidence-directory snapshot assertions.
  createPublicClient({ transport: http(TOKYO_RPC, { retryCount: 0 }) });
  await assert.rejects(saveEvidence(Symbol('observer calibration'), capture.provenance), TypeError);
  const calibrationFile = new URL(`../../.git/test-policy-observer-${randomUUID()}.txt`, import.meta.url);
  try {
    await writeFile(calibrationFile, 'Function-entry observer calibration, not transaction evidence.\n', { flag: 'wx' });
  } finally { await unlink(calibrationFile); }
  assert.ok(counts.createPublicClient > 0 && counts.http > 0 && counts.saveEvidence > 0 && counts.mkdir > 0 && counts.writeFile > 0, 'Function observer positive controls did not fire');
  const calibration = { ...counts };
  for (const name of Object.keys(counts)) counts[name] = 0;

  const envelope = historicalEnvelope();
  const context = { wallet: capture.account.address, chainId: capture.provenance.network.chainId };
  if (mode === 'absent-foreign') {
    assert.equal(MARGIN_HOLD.active, false);
    for (const input of [undefined, { envelope: { ...envelope, from: capture.system.marginBank } }, { envelope: { ...envelope, chainId: 0 } }, { envelope: { ...envelope, from: undefined } }])
      await assert.rejects(broadcastSignedTransaction(input), /Only the authorized bounty EOA/);
  } else if (mode === 'hold') {
    assert.equal(MARGIN_HOLD.active, true);
    for (const action of ['approve', 'deposit', 'order'])
      assert.throws(() => assertOnchainActionAllowed(action, context), /HOLD:/);
    // Only historical unsigned fields: the real first gate must reject before
    // recovery, transport or sending. No raw/signature fixture is generated.
    for (const action of ['approve', 'deposit', 'order'])
      await assert.rejects(broadcastSignedTransaction({ envelope, intent: { action } }), /HOLD:/);
  } else if (mode === 'cli-hold') {
    assert.ok(['prepare-margin.mjs', 'prepare-order.mjs', 'prepare-close-order.mjs'].includes(script));
    process.argv = [process.execPath, script, '--address', context.wallet, '--amount', '2', '--market', 'BTC'];
    await assert.rejects(import(new URL(`../../scripts/${script}`, import.meta.url)), /HOLD:/);
  } else throw new Error('Unknown boundary-probe mode');

  assert.deepEqual(counts, Object.fromEntries(Object.keys(functions).map(name => [name, 0])), 'Rejected action entered transport, evidence, filesystem write or send function');
  assert.equal(injections, held ? 1 : 0);
  console.log(JSON.stringify({ mode, script, held, policyInjections: injections, context, calibration, rejectedCallCounts: counts }));
} finally {
  await session.post('Debugger.disable');
  session.disconnect();
  delete globalThis.__lucidkeeperPolicyProbeFunctions;
}
