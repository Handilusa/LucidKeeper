import assert from 'node:assert/strict';
import * as viem from 'viem';
import { perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { capture, approval, amount, historicalEnvelope, btc, bigintGrid, order, decodedOrder } from '../fixtures/captured.mjs';
import { envelopeTransaction, validateUnsignedEnvelope } from '../../src/lib/offline-transactions.mjs';
import { loadWithBoundaries } from './load-with-boundaries.mjs';

// Controlled outcomes only. This sentinel is deliberately not a raw transaction;
// neither recovery nor send can reach a real client or signer in this harness.
export const RAW_SENTINEL = 'CONTROLLED_TEST_NOT_A_RAW_TRANSACTION';
const timestamp = Number(capture.provenance.block.timestamp);

export async function createBroadcastHarness(options = {}) {
  const state = {
    envelope: structuredClone(historicalEnvelope()),
    intent: { action: 'approve', amount: amount.toString() },
    expiresAt: timestamp + 300, raw: RAW_SENTINEL,
    calls: [], evidence: [], hold: false, nonceCalls: 0, ...options,
  };
  const record = (name, args) => { state.calls.push({ name, args: structuredClone(args) }); };
  const rpc = {
    async getChainId() { record('chain'); return state.chain ?? 50383; },
    async getBlock(args) {
      record(args.blockNumber !== undefined ? 'canonical' : 'latest', args);
      if (args.blockNumber !== undefined) {
        if (state.canonicalError) throw Error('Controlled canonical read failure');
        return { hash: state.canonicalHash ?? approval.receipt.blockHash };
      }
      if (state.onLatest) await state.onLatest();
      return { number: BigInt(approval.receipt.blockNumber), timestamp: BigInt(timestamp), baseFeePerGas: state.baseFee ?? 1n };
    },
    async getTransactionCount(args) {
      record('nonce', args); state.nonceCalls++;
      if (state.nonceCalls === 2 && state.onFinalNonce) state.onFinalNonce();
      return state.nonceCalls === 2 ? state.finalNonce ?? state.envelope.nonce : state.pendingNonce ?? state.envelope.nonce;
    },
    async getCode(args) { record('code', args); return state.code ?? '0x'; },
    async getBalance(args) { record('gas-balance', args); return state.balance ?? 10n ** 30n; },
    async readContract(args) {
      record(args.functionName, args);
      const table = {
        getSystemConfig: { ...capture.system, ...state.system }, decimals: state.decimals ?? 18,
        allowance: state.allowance ?? 0n, balanceOf: state.collateralBalance ?? amount,
        isDeployedByFactory: state.member ?? true, marginBank: state.bank ?? capture.system.marginBank,
        getOrderBookParameters: state.grid ?? bigintGrid(btc),
        getAccountState: { unlockedCollateralBalance: state.margin ?? amount },
      };
      assert.ok(Object.hasOwn(table, args.functionName), `Unmodelled read: ${args.functionName}`);
      return table[args.functionName];
    },
    async estimateGas(args) {
      record('estimate', args);
      if (state.simulationError) throw Error('Controlled simulation failure; upstream body');
      return state.estimate ?? 1n;
    },
    async sendRawTransaction(args) {
      record('controlled-send', args);
      assert.equal(args.serializedTransaction, RAW_SENTINEL);
      if (state.sendError) throw Error('Controlled ambiguous failure; sensitive upstream body');
      return state.sendHash ?? approval.hash;
    },
    async getTransactionReceipt(args) {
      record('receipt', args); assert.equal(args.hash, approval.hash);
      if (state.receiptError) throw Error('Controlled unavailable receipt');
      return { ...approval.receipt, to: state.envelope.to, ...state.receipt };
    },
  };
  const { broadcastSignedTransaction } = await loadWithBoundaries(new URL('../../src/lib/broadcast.mjs', import.meta.url), {
    viem: { ...viem,
      http(url, options) { record('transport', { url, options }); return {}; },
      createPublicClient(options) { record('client'); assert.equal(options.chain.id, 50383); return rpc; },
    },
    './dreamdex.mjs': { BOUNTY_EOA: capture.account.address,
      async saveEvidence(kind, data) {
        record('controlled-evidence', { kind }); assert.equal(kind, 'broadcast');
        state.evidence.push(structuredClone(data));
        if (state.onEvidence) state.onEvidence(data);
      },
    },
    './operating-policy.mjs': {
      assertOnchainActionAllowed(action, context) {
        record('policy', { action, context });
        assert.ok(!state.hold, 'HOLD: controlled restored state');
        assert.equal(context.chainId, 50383); assert.equal(context.wallet, capture.account.address);
        assert.ok(['approve', 'deposit', 'order'].includes(action));
      },
    },
    './offline-transactions.mjs': {
      COLLATERAL: capture.system.collateralToken, MARGIN_BANK: capture.system.marginBank, envelopeTransaction,
      async validateSignedTransaction(raw, envelope, intent) {
        record('controlled-recovery', { raw, envelope, intent });
        assert.equal(raw, RAW_SENTINEL);
        validateUnsignedEnvelope(envelope, intent);
        if (state.reviewMismatch) throw Error('Controlled signed nonce differs from reviewed envelope');
        return { action: intent.action, from: capture.account.address, hash: approval.hash };
      },
    },
  }, { now: timestamp * 1000 });
  const request = () => ({ raw: state.raw, envelope: state.envelope, intent: state.intent, expiresAt: state.expiresAt });
  const calls = name => state.calls.filter(call => call.name === name);
  return { state, calls, request, broadcast: input => broadcastSignedTransaction(input ?? request()),
    deposit() { state.envelope = structuredClone(historicalEnvelope(capture.execution[1])); state.intent.action = 'deposit'; },
    order() {
      state.envelope = structuredClone(historicalEnvelope(order));
      const args = [...decodedOrder.args]; args[4] = BigInt(state.expiresAt) * 1_000_000_000n;
      state.envelope.data = viem.encodeFunctionData({ abi: perpPoolWriteAbi, functionName: 'placeOrder', args });
      state.intent = { action: 'order', pool: order.transaction.to, isBid: args[0], price: args[2].toString(), quantity: args[3].toString(), expireTimestampNs: args[4].toString() };
    },
  };
}
