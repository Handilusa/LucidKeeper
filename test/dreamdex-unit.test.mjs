import test from 'node:test';
import assert from 'node:assert/strict';
import { unlink } from 'node:fs/promises';
import {
  walletAddress,
  bountyAddress,
  exactUnits,
  orderParams,
  buildUnsignedOrder,
  receiptEvidence,
  openTokyo,
  verifyNetwork,
  saveEvidence,
  verifiedMarket,
  readAccount,
  BOUNTY_EOA,
} from '../src/lib/dreamdex.mjs';

test('dreamdex: walletAddress and bountyAddress validation', () => {
  assert.equal(
    walletAddress('0x1420cf8bb9d92c3fdb674ecc5a57295c59078fda'),
    '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA'
  );
  assert.throws(() => walletAddress('not-an-address'), /Expected a valid public wallet address/);
  assert.throws(() => walletAddress('0x123'), /Expected a valid public wallet address/);

  assert.equal(bountyAddress(BOUNTY_EOA), BOUNTY_EOA);
  assert.throws(
    () => bountyAddress('0x0000000000000000000000000000000000000001'),
    /Only the authorized bounty EOA may prepare transactions/
  );
});

test('dreamdex: exactUnits parsing and validation', () => {
  assert.equal(exactUnits('100', 18, 'Margin'), 100000000000000000000n);
  assert.equal(exactUnits('0.00013', 8, 'BTC'), 13000n);
  assert.throws(() => exactUnits('abc', 18, 'Amount'), /must be a positive decimal string/);
  assert.throws(() => exactUnits('-5', 18, 'Amount'), /must be a positive decimal string/);
  assert.throws(() => exactUnits('0', 18, 'Amount'), /must be greater than zero/);
  assert.throws(() => exactUnits('0.123456789', 8, 'Amount'), /exceeds market decimals/);
});

test('dreamdex: orderParams validation with grid constraints', () => {
  const market = {
    poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    baseDecimals: 8,
    quoteDecimals: 18,
  };
  const grid = {
    tickSize: 10n ** 18n, // 1 USDso
    lotSize: 1000n, // 0.0001 BTC
    minQuantity: 10000n, // 0.0001 BTC
  };

  // Valid Buy order
  const paramsBuy = orderParams(market, grid, {
    side: 'buy',
    quantity: '0.00013',
    price: '80000',
  });
  assert.equal(paramsBuy.isBid, true);
  assert.equal(paramsBuy.quantity, 13000n);
  assert.equal(paramsBuy.price, 80000000000000000000000n);
  assert.equal(paramsBuy.orderType, 2); // IOC

  // Valid Sell order
  const paramsSell = orderParams(market, grid, {
    side: 'sell',
    quantity: '0.00013',
    price: '79900',
  });
  assert.equal(paramsSell.isBid, false);

  // Invalid side
  assert.throws(() => orderParams(market, grid, { side: 'hold', quantity: '0.00013', price: '80000' }), /Side must be buy or sell/);

  // Off grid tick
  assert.throws(
    () => orderParams(market, grid, { side: 'buy', quantity: '0.00013', price: '80000.5' }),
    /Price is not on the tick grid/
  );

  // Off grid lot
  assert.throws(
    () => orderParams(market, grid, { side: 'buy', quantity: '0.000135', price: '80000' }),
    /Quantity is not on the lot grid/
  );

  // Below minQuantity
  assert.throws(
    () => orderParams(market, grid, { side: 'buy', quantity: '0.00005', price: '80000' }),
    /Quantity is below the market minimum/
  );
});

test('dreamdex: buildUnsignedOrder encoding', () => {
  const params = {
    pool: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    isBid: false,
    price: 79900000000000000000000n,
    quantity: 13000n,
    orderType: 2,
  };
  const blockTimestamp = 1730000000n;
  const unsigned = buildUnsignedOrder(params, blockTimestamp);

  assert.equal(unsigned.chainId, 50383);
  assert.equal(unsigned.to, params.pool);
  assert.equal(unsigned.value, 0n);
  assert.equal(unsigned.expireTimestampNs, (blockTimestamp + 300n) * 1_000_000_000n);
  assert(typeof unsigned.data === 'string' && unsigned.data.startsWith('0x'));
});

test('dreamdex: openTokyo, verifyNetwork and saveEvidence', async () => {
  const { rpc, exchange } = openTokyo();
  assert(rpc);
  assert(exchange);

  const mockRpc = {
    getChainId: async () => 50383,
    getBlock: async ({ blockNumber }) => ({ hash: '0xgenesis123' }),
  };
  const net = await verifyNetwork(mockRpc);
  assert.equal(net.chainId, 50383);
  assert.equal(net.genesisHash, '0xgenesis123');

  const mockWrongRpc = {
    getChainId: async () => 1,
  };
  await assert.rejects(() => verifyNetwork(mockWrongRpc), /RPC is not Tokyo testnet/);

  const saved = await saveEvidence('test-evidence', { hello: 'world' });
  assert(saved.pathname.includes('test-evidence'));
  await unlink(saved);
});

test('dreamdex: verifiedMarket with mocked rpc & exchange', async () => {
  const market = {
    baseSymbol: 'BTC',
    marketType: 'PERP',
    chainId: 50383,
    baseDecimals: 8,
    quoteDecimals: 18,
    poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    marginBank: '0x478769e1177c0773c43a593dccc4ad15f15f1394',
    quoteToken: '0xed7993a74dae1e6656b704a424dcd8711aaf4f72',
    tickSize: '1000000000000000000',
    lotSize: '1000',
    minQuantity: '10000',
  };

  const mockRpc = {
    getBlockNumber: async () => 34042000n,
    readContract: async ({ functionName }) => {
      if (functionName === 'marginBank') return market.marginBank;
      if (functionName === 'getOneBase') return 10n ** 8n;
      if (functionName === 'getOrderBookParameters') {
        return {
          tickSize: 1000000000000000000n,
          lotSize: 1000n,
          minQuantity: 10000n,
        };
      }
      if (functionName === 'decimals') return 18;
      throw new Error(`Unexpected function ${functionName}`);
    },
  };

  const mockExchange = {
    client: {
      getPerpSystemConfig: async (bank) => ({
        fullyWired: true,
        collateralToken: market.quoteToken,
        marginBank: bank,
      }),
    },
  };

  const res = await verifiedMarket(mockExchange, mockRpc, [market], 'BTC');
  assert.equal(res.market.baseSymbol, 'BTC');
  assert.equal(res.blockNumber, 34042000n);
});

test('dreamdex: readAccount with mocked rpc & exchange', async () => {
  const system = {
    marginBank: '0x478769e1177c0773c43a593dccc4ad15f15f1394',
    collateralToken: '0xed7993a74dae1e6656b704a424dcd8711aaf4f72',
  };
  const mockExchange = {
    client: {
      getMarginAccount: async () => ({ asOfBlock: 34044000n, balance: 1000n }),
      getPerpVoucherEligibility: async () => false,
    },
  };
  const mockRpc = {
    getBalance: async () => 1000000000000000000n,
    readContract: async () => 5000000000000000000n,
    getCode: async () => undefined,
  };

  const acc = await readAccount(mockExchange, mockRpc, system, BOUNTY_EOA);
  assert.equal(acc.address, BOUNTY_EOA);
  assert.equal(acc.accountHasCode, false);
});

test('dreamdex: receiptEvidence checks receipt status and fails without events', () => {
  const market = {
    poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    marginBank: '0x478769e1177c0773c43a593dccc4ad15f15f1394',
  };
  const account = BOUNTY_EOA;

  assert.throws(
    () => receiptEvidence({ status: 'reverted', logs: [] }, market, account),
    /Transaction reverted/
  );

  assert.throws(
    () => receiptEvidence({ status: 'success', logs: [] }, market, account),
    /No placement or position event/
  );
});
