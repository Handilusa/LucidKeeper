import React, { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, zeroAddress } from 'viem';
import { toast } from 'sonner';
import { perpPoolAbi } from '@/chain/abis';
import type { MarketInfo } from '@/lib/data/indexer';
import { computeLiquidationPrice } from '@/lib/math/liquidation';
import { formatDynamicPrice, quantizeToGrid } from '@/lib/math/format';
import type { PositionItem } from '@/features/portfolio/PositionsTable';

interface TradingBoxProps {
  market: MarketInfo;
  markPrice: number;
  availableMargin: number;
  currentPosition?: PositionItem;
  onOrderSuccess?: () => void;
}

export const TradingBox: React.FC<TradingBoxProps> = ({
  market,
  markPrice,
  availableMargin,
  currentPosition,
  onOrderSuccess,
}) => {
  const { isConnected } = useAccount();

  // Read pool parameters dynamically from the contract
  const { data: poolParams } = useReadContract({
    address: market.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getPerpPoolParameters',
  });

  // Read orderbook grid parameters (tickSize, minQuantity, lotSize)
  const { data: orderBookParams } = useReadContract({
    address: market.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getOrderBookParameters',
  });

  const maxLeverage = poolParams?.initialMarginBps
    ? Math.floor(10000 / poolParams.initialMarginBps)
    : 20;
  const maintenanceMarginBps = poolParams?.maintenanceMarginBps
    ? BigInt(poolParams.maintenanceMarginBps)
    : 250n;
  const takerFeeRate = poolParams?.takerFeeBpsTimes1k
    ? Number(poolParams.takerFeeBpsTimes1k) / (1000 * 10000)
    : 0;

  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [limitPrice, setLimitPrice] = useState<string>(markPrice ? markPrice.toString() : '');
  const [quantity, setQuantity] = useState<string>(market.minQuantity || '0.00013');
  const [leverage, setLeverage] = useState<number>(5);

  // Sync defaults when market changes
  React.useEffect(() => {
    if (market.minQuantity) {
      setQuantity(market.minQuantity);
    }
  }, [market.id, market.minQuantity]);

  React.useEffect(() => {
    if (markPrice > 0 && orderType === 'market') {
      setLimitPrice(markPrice < 1 ? markPrice.toFixed(4) : markPrice.toFixed(2));
    }
  }, [market.id, markPrice, orderType]);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const notifiedHashRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (isConfirmed && hash && notifiedHashRef.current !== hash) {
      notifiedHashRef.current = hash;
      toast.success('Order confirmed on Somnia Tokyo!', {
        id: `order-confirmed-${hash}`,
        description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      onOrderSuccess?.();
    }
  }, [isConfirmed, hash, onOrderSuccess]);

  // Dynamic Calculations
  const numericQty = parseFloat(quantity) || 0;
  const executionPrice = orderType === 'market' ? markPrice : parseFloat(limitPrice) || markPrice;
  const notional = numericQty * executionPrice;
  const marginRequired = leverage > 0 ? notional / leverage : notional;
  const estFee = notional * takerFeeRate;

  // Precision matching market grid and quote decimals
  const tickDecimals =
    market.tickSize && market.tickSize.includes('.')
      ? market.tickSize.split('.')[1].length
      : executionPrice < 1
      ? 4
      : 2;

  // Projected liquidation price calculation using real on-chain parameters
  const dummyEquity = parseUnits((availableMargin > 0 ? availableMargin : 2.0).toString(), 18);
  const dummyMmReq = parseUnits((notional * (Number(maintenanceMarginBps) / 10000)).toFixed(6), 18);
  const rawSize = parseUnits(quantity || '0', market.baseDecimals);
  const rawMark = parseUnits(
    executionPrice.toFixed(Math.min(tickDecimals, market.quoteDecimals)),
    market.quoteDecimals
  );
  const oneBase = 10n ** BigInt(market.baseDecimals);

  const projectedLiq = computeLiquidationPrice({
    equity: dummyEquity,
    mmReq: dummyMmReq,
    size: side === 'buy' ? rawSize : -rawSize,
    markPrice: rawMark,
    maintenanceMarginBps,
    oneBase,
  });

  const formattedLiqPrice = projectedLiq
    ? executionPrice < 1
      ? parseFloat(formatUnits(projectedLiq, 18)).toFixed(4)
      : parseFloat(formatUnits(projectedLiq, 18)).toFixed(1)
    : 'Safe';

  const handleExecuteOrder = async () => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    try {
      const rawTickSize =
        orderBookParams?.tickSize ??
        parseUnits(market.tickSize || '0.00001', market.quoteDecimals);
      const rawLotSize =
        orderBookParams?.lotSize ??
        parseUnits(market.lotSize || '0.00001', market.baseDecimals);

      let rawPrice: bigint;
      if (orderType === 'market') {
        // 2% IOC slippage: ceiling for buy, floor for sell to cross book
        const basePriceAtoms = parseUnits(
          executionPrice.toFixed(market.quoteDecimals > 6 ? 6 : 2),
          market.quoteDecimals
        );
        const slippagePrice =
          side === 'buy'
            ? (basePriceAtoms * 102n) / 100n
            : (basePriceAtoms * 98n) / 100n;
        rawPrice = quantizeToGrid(slippagePrice, rawTickSize, 'floor');
        if (rawPrice === 0n) rawPrice = rawTickSize;
      } else {
        const baseLimitPrice = parseUnits(
          limitPrice || executionPrice.toString(),
          market.quoteDecimals
        );
        rawPrice = quantizeToGrid(baseLimitPrice, rawTickSize, 'round');
        if (rawPrice === 0n) rawPrice = rawTickSize;
      }

      const parsedQty = parseUnits(quantity || '0', market.baseDecimals);
      const rawQuantity = quantizeToGrid(parsedQty, rawLotSize, 'floor');

      if (orderBookParams?.minQuantity && rawQuantity < orderBookParams.minQuantity) {
        toast.error(`Order size is below market minimum (${market.minQuantity} ${market.baseSymbol})`);
        return;
      }

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 300) * 1_000_000_000n; // 5 mins in ns

      // Type 2 = IOC for Market, Type 0 = Limit
      const onchainOrderType = orderType === 'market' ? 2 : 0;

      toast.info('Simulating and preparing transaction in wallet...');

      await writeContractAsync({
        chainId: 50383,
        address: market.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [
          side === 'buy',
          0n, // userData (uint64)
          rawPrice,
          rawQuantity,
          expiry,
          onchainOrderType,
          0, // selfMatchingOption
          zeroAddress,
          0n, // builderFeeBpsTimes1k (uint96)
        ],
        gas: 5_000_000n,
      });

      toast.success('Transaction submitted! Awaiting Tokyo confirmation...');
    } catch (err: any) {
      console.error('Order error:', err);
      toast.error('Order placement rejected or failed', {
        description: err?.shortMessage || err?.message || 'Transaction reverted',
      });
    }
  };

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
        <h3 className="font-display font-bold text-base text-white">Execution Terminal</h3>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/40">
          CLOB Direct
        </span>
      </div>

      {/* Buy / Sell Direction Tabs */}
      {currentPosition && (
        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-800/40 text-xs font-mono flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                currentPosition.isLong
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              ACTIVE {currentPosition.isLong ? 'LONG' : 'SHORT'}
            </span>
            <span className="text-white font-semibold">
              {currentPosition.size} {market.baseSymbol}
            </span>
          </div>
          <span className="text-slate-400">
            Avg: ${formatDynamicPrice(currentPosition.entryPrice)}
          </span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#070a0e] border border-[#1a2536]">
        <button
          onClick={() => setSide('buy')}
          className={`py-2 rounded-md font-display font-bold text-sm transition-all ${
            side === 'buy'
              ? 'bg-emerald-500 text-black shadow-lg glow-emerald'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Long / Buy
        </button>
        <button
          onClick={() => setSide('sell')}
          className={`py-2 rounded-md font-display font-bold text-sm transition-all ${
            side === 'sell'
              ? 'bg-rose-500 text-white shadow-lg glow-rose'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Short / Sell
        </button>
      </div>

      {/* Order Type Selector */}
      <div className="flex items-center space-x-2 text-xs font-mono">
        <button
          onClick={() => setOrderType('market')}
          className={`px-3 py-1 rounded transition-colors ${
            orderType === 'market'
              ? 'bg-[#1a2536] text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Market (IOC)
        </button>
        <button
          onClick={() => setOrderType('limit')}
          className={`px-3 py-1 rounded transition-colors ${
            orderType === 'limit'
              ? 'bg-[#1a2536] text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Limit
        </button>
      </div>

      {/* Limit Price Input if Limit Order */}
      {orderType === 'limit' && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Limit Price</span>
            <span>USDso</span>
          </div>
          <input
            type="number"
            step={market.tickSize}
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            aria-label="Limit Price in USDso"
            className="w-full px-3 py-2 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
          />
        </div>
      )}

      {/* Order Quantity Input */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>Order Size</span>
          <span>
            Min: {market.minQuantity} {market.baseSymbol}
          </span>
        </div>
        <div className="relative">
          <input
            type="number"
            step={market.lotSize}
            min={market.minQuantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            aria-label={`Order Quantity in ${market.baseSymbol}`}
            className="w-full px-3 py-2 pr-16 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
          />
          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 font-bold">
            {market.baseSymbol}
          </span>
        </div>
      </div>

      {/* Leverage Slider */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Leverage (Max {maxLeverage}x)</span>
          <span className="text-cyan-400 font-bold">{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max={maxLeverage}
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
          aria-label="Trading leverage multiplier"
          className="w-full accent-cyan-400 cursor-pointer"
        />
        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>1x</span>
          <span>5x</span>
          <span>10x</span>
          <span>{maxLeverage}x (Pool Max)</span>
        </div>
      </div>

      {/* Order Preview Breakdown */}
      <div className="p-3 rounded-lg bg-[#070a0e]/60 border border-[#1a2536] space-y-2 text-xs font-mono">
        <div className="flex justify-between text-slate-400">
          <span>Order Notional:</span>
          <span className="text-white">${notional.toFixed(2)} USDso</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Margin Required:</span>
          <span className="text-cyan-400 font-semibold">${marginRequired.toFixed(2)} USDso</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Est. Liquidation Price:</span>
          <span className="text-rose-400 font-semibold">~${formattedLiqPrice} USDso</span>
        </div>
        <div className="flex justify-between text-slate-400">
          <span>Est. Fees (0.05%):</span>
          <span className="text-slate-300">${estFee.toFixed(4)} USDso</span>
        </div>
      </div>

      {/* Action Button */}
      <button
        disabled={isPending || isConfirming || numericQty < parseFloat(market.minQuantity)}
        onClick={handleExecuteOrder}
        className={`w-full py-3 rounded-lg font-display font-extrabold text-sm transition-all shadow-lg ${
          side === 'buy'
            ? 'bg-emerald-500 hover:bg-emerald-400 text-black glow-emerald'
            : 'bg-rose-500 hover:bg-rose-400 text-white glow-rose'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isPending || isConfirming ? (
          <span className="flex items-center justify-center space-x-2">
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
            <span>Confirming on Somnia...</span>
          </span>
        ) : (
          <span>
            {currentPosition
              ? currentPosition.isLong
                ? side === 'buy'
                  ? `Add to Long (+${quantity} ${market.baseSymbol})`
                  : `Reduce / Close Long (-${quantity} ${market.baseSymbol})`
                : side === 'sell'
                ? `Add to Short (+${quantity} ${market.baseSymbol})`
                : `Reduce / Close Short (-${quantity} ${market.baseSymbol})`
              : `${side === 'buy' ? 'Open Long' : 'Open Short'} ${quantity} ${market.baseSymbol}`}
          </span>
        )}
      </button>
    </div>
  );
};
