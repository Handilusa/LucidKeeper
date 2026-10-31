import * as viem from 'viem';
import { envelopeTransaction } from '../../src/lib/offline-transactions.mjs';
import { historicalEnvelope } from '../fixtures/captured.mjs';
import { loadWithBoundaries } from './load-with-boundaries.mjs';

// Adversarial public curve scalars, NOT a signature produced by a signer. The
// serialized test input exists only in memory and cannot authenticate the EOA.
export const curveOrder = 115792089237316195423570985008687907852837564279074904382605163141518161494337n;
export function adversarialWire(changes = {}, scalars = {}) {
  return viem.serializeTransaction({ ...envelopeTransaction(historicalEnvelope()), ...changes }, {
    r: viem.toHex(1n, { size: 32 }), s: viem.toHex(1n, { size: 32 }), yParity: 0, ...scalars,
  });
}

export async function createWireBoundary() {
  const recoveries = [];
  const validator = await loadWithBoundaries(new URL('../../src/lib/offline-transactions.mjs', import.meta.url), {
    viem: { ...viem, async recoverTransactionAddress(args) {
      recoveries.push(args);
      throw new Error('Unexpected recovery: test input should have failed at the wire boundary');
    } },
  });
  return { ...validator, recoveries };
}
