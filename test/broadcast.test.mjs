import assert from 'node:assert/strict';
import { beforeEach, mock, test } from 'node:test';
import * as viem from 'viem';
import * as dreamdex from '../src/lib/dreamdex.mjs';
import * as policy from '../src/lib/operating-policy.mjs';
import { marginBankWriteAbi } from '@somnia-chain/markets-sdk';

// Node module mocks exist only in this test process. Runtime has no injected signer,
// recovery override, alternate transport or HOLD bypass.
let rpc, records, creates, sends, recovered, hold, now, transport;
mock.module('viem', { exports: {
  ...viem,
  recoverTransactionAddress: async () => recovered,
  createPublicClient: () => { creates++; return rpc; },
  http: (url, options) => { transport = { url, options }; return () => {}; },
} });
mock.module('../src/lib/dreamdex.mjs', { exports: {
  ...dreamdex, saveEvidence: async (kind, data) => { records.push({ kind, ...structuredClone(data) }); return 'mock-evidence'; },
} });
mock.module('../src/lib/operating-policy.mjs', { exports: {
  ...policy, assertOnchainActionAllowed: () => { if (hold) throw new Error('HOLD: test policy'); },
} });
const { broadcastSignedTransaction, TOKYO_RPC } = await import('../src/lib/broadcast.mjs');
const { buildUnsignedEnvelope, envelopeTransaction, validateSignedTransaction, COLLATERAL, MARGIN_BANK, TEST_MARGIN_AMOUNT } = await import('../src/lib/offline-transactions.mjs');
const { BOUNTY_EOA } = dreamdex;
const pool = '0x1111111111111111111111111111111111111111';
const blockHash = viem.toHex(3n, { size: 32 });
const fakeSignature = { r: viem.toHex(1n, { size: 32 }), s: viem.toHex(1n, { size: 32 }), yParity: 0 };
let receipt;

function request(action = 'approve') {
  const intent = action === 'order'
    ? { action, pool, isBid: true, price: (80000n * 10n ** 18n).toString(), quantity: '13000', expireTimestampNs: ((BigInt(now) + 240n) * 1_000_000_000n).toString() }
    : { action, amount: TEST_MARGIN_AMOUNT.toString() };
  const call = action === 'order'
    ? { ...dreamdex.buildUnsignedOrder({ pool, isBid: true, price: BigInt(intent.price), quantity: 13000n, orderType: 2 }, BigInt(now) - 60n), from: BOUNTY_EOA }
    : { chainId: 50383, from: BOUNTY_EOA, to: action === 'approve' ? COLLATERAL : MARGIN_BANK, value: 0n,
      data: viem.encodeFunctionData({ abi: action === 'approve' ? viem.erc20Abi : marginBankWriteAbi, functionName: action,
        args: action === 'approve' ? [MARGIN_BANK, TEST_MARGIN_AMOUNT] : [TEST_MARGIN_AMOUNT] }) };
  const envelope = buildUnsignedEnvelope({ call, nonce: 7, gas: 100000n, fees: { maxFeePerGas: 10n, maxPriorityFeePerGas: 1n }, description: 'Synthetic offline test only.' }, intent);
  const raw = viem.serializeTransaction(envelopeTransaction(envelope), fakeSignature);
  receipt = { transactionHash: viem.keccak256(raw), from: BOUNTY_EOA, to: envelope.to, status: 'success', blockNumber: 100n, blockHash, logs: [] };
  return { raw, envelope, intent, expiresAt: now + 240 };
}

beforeEach(() => {
  records = []; creates = 0; sends = 0; hold = false; recovered = BOUNTY_EOA;
  now = Math.floor(Date.now() / 1000);
  // Any accidental network fallback fails instead of making a request.
  mock.method(globalThis, 'fetch', async () => { assert.fail('Network is forbidden in offline tests'); });
  rpc = {
    getChainId: async () => 50383,
    getBlock: async () => ({ timestamp: BigInt(now), number: 99n, baseFeePerGas: 1n, hash: blockHash }),
    getTransactionCount: async () => 7,
    getCode: async () => '0x',
    getBalance: async () => 10000000n,
    readContract: async ({ functionName }) => {
      const values = {
        getSystemConfig: { fullyWired: true, marginBank: MARGIN_BANK, collateralToken: COLLATERAL, perpPoolFactory: pool },
        decimals: 18, allowance: 0n, balanceOf: TEST_MARGIN_AMOUNT,
        isDeployedByFactory: true, marginBank: MARGIN_BANK,
        getOrderBookParameters: { tickSize: 10n ** 17n, minQuantity: 13000n, lotSize: 1000n },
        getAccountState: { unlockedCollateralBalance: TEST_MARGIN_AMOUNT },
      };
      assert(functionName in values, `Unexpected fake read: ${functionName}`);
      return values[functionName];
    },
    estimateGas: async () => 50000n,
    sendRawTransaction: async ({ serializedTransaction }) => { sends++; return viem.keccak256(serializedTransaction); },
    getTransactionReceipt: async ({ hash }) => { assert.equal(hash, receipt.transactionHash); return receipt; },
  };
});

test('mocked recovered sender permits an exact wire match without real signing', async () => {
  const input = request();
  const result = await validateSignedTransaction(input.raw, input.envelope, input.intent);
  assert.equal(result.from, BOUNTY_EOA);
  assert.equal(result.hash, viem.keccak256(input.raw));
  recovered = pool;
  await assert.rejects(validateSignedTransaction(input.raw, input.envelope, input.intent), /Recovered sender/);
});

test('HOLD prevents transport creation, evidence writes and sends', async () => {
  hold = true;
  await assert.rejects(broadcastSignedTransaction(request()), /HOLD/);
  assert.equal(creates, 0);
  assert.equal(sends, 0);
  assert.deepEqual(records, []);
});

test('review mismatch and expired requests stop before creating transport', async () => {
  const input = request();
  await assert.rejects(broadcastSignedTransaction({ ...input, envelope: { ...input.envelope, nonce: 8 } }), /Signed nonce/);
  await assert.rejects(broadcastSignedTransaction({ ...input, expiresAt: now - 1 }), /expired/);
  assert.equal(creates, 0);
  assert.equal(sends, 0);
});

test('fake success uses only pinned RPC, disables retries and records canonical confirmation without fill claims', async () => {
  const input = request();
  const result = await broadcastSignedTransaction(input);
  assert.equal(result.state, 'confirmed');
  assert.equal(result.fillVerified, false);
  assert.equal(sends, 1);
  assert.equal(transport.url, TOKYO_RPC);
  assert.equal(transport.options.retryCount, 0);
  assert.deepEqual(records.map(row => row.state), ['validated-not-sent', 'submitted', 'confirmed']);
  assert(!JSON.stringify(records, (_, value) => typeof value === 'bigint' ? value.toString() : value).includes(input.raw));
});

test('wrong chain, nonce, delegated account, gas and simulation fail before send', async () => {
  const input = request();
  for (const [name, replacement] of [
    ['getChainId', async () => 50312], ['getTransactionCount', async () => 8],
    ['getCode', async () => '0xef0100'], ['getBalance', async () => 0n],
    ['estimateGas', async () => 100001n], ['estimateGas', async () => { throw new Error('simulation reverted'); }],
  ]) {
    const original = rpc[name]; rpc[name] = replacement;
    await assert.rejects(broadcastSignedTransaction(input), /preflight failed/);
    rpc[name] = original;
  }
  assert.equal(sends, 0);
});

test('funding checks reject wrong collateral, absent USDso and unconfirmed deposit allowance', async () => {
  for (const [field, value] of [
    ['getSystemConfig', { fullyWired: true, marginBank: MARGIN_BANK, collateralToken: pool }],
    ['decimals', 6], ['balanceOf', 0n], ['allowance', 1n],
  ]) {
    const original = rpc.readContract;
    rpc.readContract = async args => args.functionName === field ? value : original(args);
    await assert.rejects(broadcastSignedTransaction(request()), /preflight failed/);
    rpc.readContract = original;
  }
  const deposit = request('deposit');
  await assert.rejects(broadcastSignedTransaction(deposit), /preflight failed/);
  const original = rpc.readContract;
  rpc.readContract = async args => args.functionName === 'allowance' ? TEST_MARGIN_AMOUNT : original(args);
  assert.equal((await broadcastSignedTransaction(deposit)).state, 'confirmed');
  assert.equal(sends, 1);
});

test('orders require official factory membership, current grid, deposited margin and no auto-pull allowance', async () => {
  const input = request('order');
  for (const [field, value] of [
    ['isDeployedByFactory', false], ['marginBank', pool],
    ['getOrderBookParameters', { tickSize: 1n, lotSize: 1n, minQuantity: 14000n }],
    ['getAccountState', { unlockedCollateralBalance: 0n }], ['allowance', 1n],
  ]) {
    const original = rpc.readContract;
    rpc.readContract = async args => args.functionName === field ? value : original(args);
    await assert.rejects(broadcastSignedTransaction(input), /preflight failed/);
    rpc.readContract = original;
  }
  assert.equal(sends, 0);
  assert.equal((await broadcastSignedTransaction(input)).state, 'confirmed');
  assert.equal(sends, 1);
});

test('HOLD and pending nonce are checked again after preflight before send', async () => {
  const input = request();
  rpc.estimateGas = async () => { hold = true; return 50000n; };
  await assert.rejects(broadcastSignedTransaction(input), /HOLD/);
  assert.equal(sends, 0);
  hold = false;
  rpc.estimateGas = async () => { rpc.getTransactionCount = async () => 8; return 50000n; };
  await assert.rejects(broadcastSignedTransaction(input), /nonce changed/);
  assert.equal(sends, 0);
});

test('HOLD restored during the final nonce read still prevents a send', async () => {
  let reads = 0;
  rpc.getTransactionCount = async () => { if (++reads === 2) hold = true; return 7; };
  await assert.rejects(broadcastSignedTransaction(request()), /HOLD/);
  assert.equal(sends, 0);
});

test('input is snapshotted before awaits so later mutations cannot change the send', async () => {
  const input = structuredClone(request());
  const originalRaw = input.raw;
  rpc.getChainId = async () => { input.envelope.nonce = 9; input.raw = '0x02ff'; input.intent.amount = '1'; return 50383; };
  rpc.sendRawTransaction = async ({ serializedTransaction }) => { sends++; assert.equal(serializedTransaction, originalRaw); return viem.keccak256(serializedTransaction); };
  assert.equal((await broadcastSignedTransaction(input)).state, 'confirmed');
  assert.equal(sends, 1);
});

test('pending or unverifiable receipts stay unconfirmed', async () => {
  const input = request();
  rpc.getTransactionReceipt = async () => { throw new Error('not mined'); };
  assert.equal((await broadcastSignedTransaction(input)).state, 'pending');
  rpc.getTransactionReceipt = async () => receipt;
  const original = rpc.getBlock;
  rpc.getBlock = async args => { if ('blockNumber' in args) throw new Error('read unavailable'); return original(args); };
  assert.equal((await broadcastSignedTransaction(input)).state, 'receipt-unverified');
  assert(!records.some(row => row.state === 'confirmed'));
});

test('ambiguous send errors are sanitized, queried by computed hash, and never resent', async () => {
  const input = request();
  rpc.sendRawTransaction = async () => { sends++; throw new Error(`timeout containing ${input.raw}`); };
  rpc.getTransactionReceipt = async ({ hash }) => { assert.equal(hash, viem.keccak256(input.raw)); throw new Error('not found'); };
  const result = await broadcastSignedTransaction(input);
  assert.equal(result.state, 'send-uncertain');
  assert.equal(sends, 1);
  assert.equal(records.at(-1).state, 'send-uncertain');
  assert(!JSON.stringify(records, (_, value) => typeof value === 'bigint' ? value.toString() : value).includes(input.raw));
});

test('timeout may still resolve to a receipt; a reverted receipt is recorded as reverted', async () => {
  const input = request();
  rpc.sendRawTransaction = async () => { sends++; throw new Error('timeout'); };
  receipt.status = 'reverted';
  const result = await broadcastSignedTransaction(input);
  assert.equal(result.state, 'reverted');
  assert.equal(result.fillVerified, false);
  assert.equal(sends, 1);
});

test('noncanonical and foreign receipts cannot become confirmed evidence', async () => {
  const input = request();
  for (const change of [{ blockHash: viem.toHex(4n, { size: 32 }) }, { from: pool }, { to: pool }, { transactionHash: viem.toHex(5n, { size: 32 }) }]) {
    const original = receipt;
    receipt = { ...receipt, ...change };
    // The stub normally asserts the requested hash, so use a literal response here.
    rpc.getTransactionReceipt = async () => receipt;
    await assert.rejects(broadcastSignedTransaction(input), /canonical|mismatch/);
    receipt = original;
  }
  assert(!records.some(row => row.state === 'confirmed'));
});
