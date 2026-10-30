import { createPublicClient, http, encodeFunctionData, zeroAddress, parseAbi } from 'viem';
import { hidekiTestnet } from '@somnia-chain/markets-sdk/chains';
import { perpPoolWriteAbi } from '@somnia-chain/markets-sdk';
import { assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

assertOnchainActionAllowed('order');

const RPC_URL = 'https://api.hideki2.infra.testnet.somnia.network';
const INDEXER_URL = 'https://hideki-dev.smk.somnia.host/v1/graphql';
const BOUNTY_EOA = '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA';
const BTC_POOL = '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0';
const MARGIN_BANK = '0x478769E1177C0773c43A593DCCc4Ad15F15F1394';

async function main() {
  const client = createPublicClient({
    chain: hidekiTestnet,
    transport: http(RPC_URL, { timeout: 15_000 }),
  });

  // 1. Verify chain & account
  const chainId = await client.getChainId();
  if (chainId !== 50383) throw new Error(`Wrong chain ID: ${chainId}`);

  const block = await client.getBlock({ includeTransactions: false });
  const blockNumber = block.number;
  const blockTimestamp = block.timestamp;

  // 2. Read live position
  const bankAbi = parseAbi([
    'function getPosition(address account, address perpPool) view returns ((int256 size, uint256 avgEntryPrice, uint256 entryFundingIndex))',
  ]);
  const position = await client.readContract({
    address: MARGIN_BANK,
    abi: bankAbi,
    functionName: 'getPosition',
    args: [BOUNTY_EOA, BTC_POOL],
  });

  const rawSize = position.size;
  if (rawSize <= 0n) {
    throw new Error(`Expected a positive open Long position to close, got size: ${rawSize}`);
  }

  // 3. Read OrderBook parameters
  const poolAbi = parseAbi([
    'function getOrderBookParameters() view returns ((uint256 tickSize, uint256 minQuantity, uint256 lotSize))',
  ]);
  const grid = await client.readContract({
    address: BTC_POOL,
    abi: poolAbi,
    functionName: 'getOrderBookParameters',
  });

  // 4. Fetch mark price from indexer
  let markPrice = 79900n * 10n ** 18n; // fallback
  try {
    const res = await fetch(INDEXER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `query { PerpMarket(where: {poolAddress: {_eq: "${BTC_POOL}"}}) { markPrice } }`,
      }),
    });
    const data = await res.json();
    if (data.data?.PerpMarket?.[0]?.markPrice) {
      const parsed = BigInt(Math.floor(parseFloat(data.data.PerpMarket[0].markPrice) * 1e18));
      if (parsed > 0n) markPrice = parsed;
    }
  } catch (err) {
    console.warn('Indexer mark price unavailable, using entry price baseline:', err.message);
  }

  // 5. Construct Close Order Parameters
  // Sell IOC for exact size
  const isBid = false; // Sell
  const quantity = rawSize; // Exactly 13000 atoms (0.00013 BTC)
  // For Sell IOC, price limit is floor price. We set it with 1% slippage below mark, aligned to tickSize
  const slippageBps = 100n; // 1%
  let limitPrice = (markPrice * (10000n - slippageBps)) / 10000n;
  // Snap to tickSize grid
  limitPrice = (limitPrice / grid.tickSize) * grid.tickSize;
  const orderType = 2; // IOC (Immediate-Or-Cancel)
  const expireTimestampNs = (blockTimestamp + 900n) * 1_000_000_000n; // 15 min buffer (900 seconds)

  // 6. Encode calldata
  const calldata = encodeFunctionData({
    abi: perpPoolWriteAbi,
    functionName: 'placeOrder',
    args: [
      isBid,
      0n, // clientOrderId
      limitPrice,
      quantity,
      expireTimestampNs,
      orderType,
      0, // reduceOnly / autoDeleverage flag per SDK schema
      zeroAddress, // hookData
      0n, // builderFee
    ],
  });

  // 7. Get Nonce & Fee Parameters
  const [nonce, gasPrice] = await Promise.all([
    client.getTransactionCount({ address: BOUNTY_EOA }),
    client.getGasPrice(),
  ]);

  // 8. Estimate Gas
  let estimatedGas = 350000n;
  try {
    const est = await client.estimateGas({
      account: BOUNTY_EOA,
      to: BTC_POOL,
      data: calldata,
      value: 0n,
    });
    // Add 25% safety buffer
    estimatedGas = (est * 125n) / 100n;
  } catch (err) {
    console.warn('Simulation/estimateGas note:', err.shortMessage || err.message);
  }

  const unsignedTx = {
    chainId: 50383,
    type: 'eip1559',
    from: BOUNTY_EOA,
    to: BTC_POOL,
    value: '0',
    data: calldata,
    nonce: Number(nonce),
    gas: estimatedGas.toString(),
    maxFeePerGas: (gasPrice * 2n).toString(),
    maxPriorityFeePerGas: (gasPrice / 2n).toString(),
    actionDetails: {
      action: 'CLOSE_POSITION_SELL_IOC',
      market: 'BTC-PERP',
      pool: BTC_POOL,
      side: 'SELL',
      isBid: false,
      quantityAtoms: quantity.toString(),
      quantityFormatted: '0.00013 BTC',
      limitPriceWei: limitPrice.toString(),
      limitPriceFormatted: `${(Number(limitPrice) / 1e18).toFixed(2)} USDso (1% safety slippage floor)`,
      orderType: 'IOC (Immediate-Or-Cancel)',
      orderTypeCode: 2,
      targetPositionAfterFill: '0.00000 BTC (100% Closed)',
      expireTimestampNs: expireTimestampNs.toString(),
    },
    context: {
      blockNumber: blockNumber.toString(),
      blockTimestamp: blockTimestamp.toString(),
      network: 'Somnia Tokyo Testnet',
      status: 'PREPARED_FOR_USER_REVIEW_NOT_BROADCAST',
    },
  };

  console.log('\n======================================================');
  console.log('📋 FULL UNSIGNED TRANSACTION FOR USER REVIEW');
  console.log('======================================================\n');
  console.log(JSON.stringify(unsignedTx, null, 2));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
