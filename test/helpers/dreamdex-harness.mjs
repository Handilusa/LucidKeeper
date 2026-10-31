import assert from 'node:assert/strict';
import * as viem from 'viem';
import * as sdk from '@somnia-chain/markets-sdk';
import { capture, btc, bigintGrid } from '../fixtures/captured.mjs';
import { loadWithBoundaries } from './load-with-boundaries.mjs';

export async function createDreamdexHarness() {
  const calls = [], files = new Map();
  const blockNumber = BigInt(capture.provenance.block.number);
  const margin = { asOfBlock: blockNumber, ...capture.account.state }; // SDK-shaped controlled wrapper.
  const rpc = {
    async getChainId() { calls.push(['chain']); return 50383; },
    async getBlock(args) { calls.push(['block', args]); assert.deepEqual(args, { blockNumber: 0n }); return { hash: capture.provenance.network.genesisHash }; },
    async getBlockNumber() { return blockNumber; },
    async getBalance(args) { calls.push(['balance', args]); return BigInt(capture.account.gas); },
    async getCode(args) { calls.push(['code', args]); return undefined; }, // Controlled undelegated-account result.
    async readContract(args) {
      calls.push(['read', args]);
      const results = { marginBank: capture.system.marginBank, getOneBase: BigInt(btc.oneBase),
        getOrderBookParameters: bigintGrid(btc), decimals: 18, balanceOf: BigInt(capture.account.walletCollateral) };
      assert.ok(Object.hasOwn(results, args.functionName), `Unmodelled read: ${args.functionName}`);
      return results[args.functionName];
    },
  };
  let sequence = 0;
  const functions = await loadWithBoundaries(new URL('../../src/lib/dreamdex.mjs', import.meta.url), {
    viem: { ...viem, http(url, options) { calls.push(['transport', url, options]); return {}; },
      createPublicClient(options) { calls.push(['client', options]); return rpc; } },
    '@somnia-chain/markets-sdk': { ...sdk, SomniaMarkets: class {
      constructor(options) {
        calls.push(['sdk', options]);
        this.client = {
          async getPerpSystemConfig(bank) { assert.equal(bank.toLowerCase(), capture.system.marginBank.toLowerCase()); return capture.system; },
          async getMarginAccount(bank, address) { calls.push(['margin', bank, address]); return margin; },
          async getPerpVoucherEligibility(bank, address) { calls.push(['voucher', bank, address]); return null; }, // Controlled unavailable voucher.
        };
      }
      async close() { calls.push(['close']); }
    } },
    'node:fs/promises': {
      async mkdir(directory, options) { calls.push(['mkdir', directory.href, options]); },
      async writeFile(file, contents, options) {
        calls.push(['write', file.href, options]); assert.equal(options.flag, 'wx');
        assert.ok(!files.has(file.href), 'Exclusive test write would overwrite an existing record'); files.set(file.href, contents);
      },
    },
    'node:crypto': { randomUUID: () => `controlled-record-${++sequence}` },
  }, { now: Number(capture.provenance.block.timestamp) * 1000 });
  return { ...functions, rpc, calls, files, margin, blockNumber };
}
