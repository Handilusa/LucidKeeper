import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeFunctionData, encodeAbiParameters, encodeEventTopics, parseAbiParameters } from 'viem';
import { marginBankEventsAbi, orderBookEventsAbi, perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { buildUnsignedOrder, walletAddress, orderParams, receiptEvidence, verifyNetwork } from '../src/lib/dreamdex.mjs';

// Isolated validation fixtures; never imported by runtime scripts or used as market data.
const account = '0x1111111111111111111111111111111111111111';
const pool = '0x2222222222222222222222222222222222222222';
const bank = '0x3333333333333333333333333333333333333333';
const market = { poolAddress: pool, marginBank: bank, baseDecimals: 8, quoteDecimals: 18 };
const grid = { tickSize: 10n ** 17n, lotSize: 1000n, minQuantity: 13000n };
const input = { side: 'buy', quantity: '0.00013', price: '80500.1' };

test('only Tokyo RPC passes; wrong chain stops before further reads', async () => {
  await assert.rejects(verifyNetwork({ getChainId: async () => 5031 }), /not Tokyo/);
  assert.equal((await verifyNetwork({ getChainId: async () => 50383, getBlock: async () => ({ hash: 'genesis' }) })).chainId, 50383);
});

test('wallet boundary rejects absent, truncated and malformed addresses', () => {
  assert.equal(walletAddress(account), account);
  for (const bad of [undefined, '', '0x1234', account.replace('1', 'z')]) assert.throws(() => walletAddress(bad));
});

test('order uses separate quote/base scales with no Number conversion', () => {
  const order = orderParams(market, grid, input);
  assert.equal(order.quantity, 13000n);
  assert.equal(order.price, 80500100000000000000000n);
  assert.equal(order.orderType, 2);
  const near = { ...market, baseDecimals: 24 };
  assert.equal(orderParams(near, { ...grid, lotSize: 1n }, { ...input, quantity: '1.000000000000000000000001' }).quantity, 1000000000000000000000001n);
});

test('invalid size, excess precision, grid, side and zero never become orders', () => {
  for (const change of [
    { quantity: '0.00012' }, { quantity: '0.000131' }, { quantity: '0.000130001' },
    { quantity: '-1' }, { quantity: '1e2' }, { quantity: '0' },
    { price: '80500.11' }, { price: '0' }, { price: 'NaN' }, { side: 'long' },
  ]) assert.throws(() => orderParams(market, grid, { ...input, ...change }));
});

test('unsigned IOC encodes exact size, price, expiry and zero builder fees', () => {
    const order = buildUnsignedOrder(orderParams(market, grid, input), 1793019000n);
    assert.equal(order.chainId, 50383);
    assert.equal(order.to, pool);
    assert.equal(order.value, 0n);
    const call = decodeFunctionData({ abi: perpPoolWriteAbi, data: order.data });
    assert.equal(call.functionName, 'placeOrder');
    assert.equal(call.args[2], 80500100000000000000000n);
    assert.equal(call.args[3], 13000n);
    assert.equal(call.args[4], 1793019300000000000n);
    assert.equal(call.args[5], 2);
    assert.equal(call.args[6], 0);
    assert.equal(call.args[8], 0n);
});

const positionLog = {
  address: bank,
  topics: encodeEventTopics({ abi: marginBankEventsAbi, eventName: 'PositionUpdated', args: { account, perpPool: pool } }),
  data: encodeAbiParameters(parseAbiParameters('int128, uint128, int256, int256'), [13000n, 80500n * 10n ** 18n, 0n, 0n]),
};
const fillLog = {
  address: pool,
  topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: 'OrderFilled', args: { takerOrderId: 1n, makerOrderId: 2n } }),
  data: encodeAbiParameters(parseAbiParameters('uint256, uint256, uint256, uint256'), [13000n, 0n, 0n, 80500n * 10n ** 18n]),
};

test('successful receipt alone, foreign account and reverted tx are not evidence', () => {
  assert.throws(() => receiptEvidence({ status: 'success', logs: [] }, market, account));
  assert.throws(() => receiptEvidence({ status: 'reverted', logs: [positionLog, fillLog] }, market, account));
  assert.throws(() => receiptEvidence({ status: 'success', logs: [positionLog, fillLog] }, market, pool));
});

test('separates account position events, pool fills, and absent PnL', () => {
  const result = receiptEvidence({ status: 'success', logs: [positionLog, fillLog] }, market, account);
  assert.equal(result.poolFillObserved, true);
  assert.equal(result.accountOrderEvents.length, 0);
  assert.equal(result.accountPositionEvents[0].args.newSize, 13000n);
  assert.equal(result.pnl, null);
  const unrelated = receiptEvidence({ status: 'success', logs: [positionLog, { ...fillLog, address: account }] }, market, account);
  assert.equal(unrelated.poolFillObserved, false);
  assert.equal(unrelated.poolFillEvents.length, 0);
});

test('an owned resting order is a placement, not a fill or position', () => {
  const event = orderBookEventsAbi.find(item => item.name === 'OrderPlaced');
  const placedOrder = { orderId: 3n, isBid: true, owner: account, userData: 0n, price: 1n, fullQuantity: 13000n, quantityRemaining: 13000n, expireTimestampNs: 1793019300000000000n };
  const log = {
    address: pool,
    topics: encodeEventTopics({ abi: orderBookEventsAbi, eventName: 'OrderPlaced', args: { orderId: 3n } }),
    data: encodeAbiParameters(event.inputs.filter(input => !input.indexed), [placedOrder]),
  };
  const result = receiptEvidence({ status: 'success', logs: [log] }, market, account);
  assert.equal(result.accountOrderEvents.length, 1);
  assert.equal(result.poolFillObserved, false);
  assert.equal(result.accountPositionEvents.length, 0);
});
