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
  const [marginInput, setMarginInput] = useState<string>('2.0');
  const [lastEdited, setLastEdited] = useState<'size' | 'margin'>('margin');
  const [leverage, setLeverage] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`lucidkeeper_leverage_${market.poolAddress.toLowerCase()}`);
      if (saved && !isNaN(parseInt(saved, 10))) return parseInt(saved, 10);
    }
    return 5;
  });

  const executionPrice = orderType === 'market' ? markPrice : parseFloat(limitPrice) || markPrice;

  const lotDecimals =
    market.lotSize && market.lotSize.includes('.')
      ? market.lotSize.split('.')[1].length
      : 5;

  const syncQuantityFromMargin = React.useCallback(
    (targetMargin: number, currentLev: number, price: number) => {
      if (price <= 0 || targetMargin <= 0) return;
      const targetNotional = targetMargin * currentLev;
      const rawQty = targetNotional / price;
      const minQty = parseFloat(market.minQuantity || '0.00001');
      const lotStep = parseFloat(market.lotSize || '0.00001');
      const snapped = Math.max(Math.round(rawQty / lotStep) * lotStep, minQty);
      setQuantity(snapped.toFixed(lotDecimals));
    },
    [market.minQuantity, market.lotSize, lotDecimals]
  );

  // Sync leverage when market changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`lucidkeeper_leverage_${market.poolAddress.toLowerCase()}`);
      if (saved && !isNaN(parseInt(saved, 10))) {
        setLeverage(parseInt(saved, 10));
      }
    }
  }, [market.poolAddress]);

  // Sync defaults when market or price changes
  React.useEffect(() => {
    if (executionPrice > 0) {
      if (lastEdited === 'margin') {
        const numMargin = parseFloat(marginInput) || 2.0;
        syncQuantityFromMargin(numMargin, leverage, executionPrice);
      } else if (market.minQuantity && !quantity) {
        setQuantity(market.minQuantity);
      }
    }
  }, [market.id, executionPrice, lastEdited, leverage, marginInput, syncQuantityFromMargin]);

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
  const notional = numericQty * executionPrice;
  const marginRequired = leverage > 0 ? notional / leverage : notional;
  const estFee = notional * takerFeeRate;

  const handleLeverageChange = (newLev: number) => {
    setLeverage(newLev);
    if (typeof window !== 'undefined') {
      localStorage.setItem(`lucidkeeper_leverage_${market.poolAddress.toLowerCase()}`, newLev.toString());
    }
    if (lastEdited === 'margin' && executionPrice > 0) {
      const numMargin = parseFloat(marginInput) || 2.0;
      syncQuantityFromMargin(numMargin, newLev, executionPrice);
    }
  };

  const handleQuantityInput = (newQty: string) => {
    setLastEdited('size');
    setQuantity(newQty);
    const num = parseFloat(newQty) || 0;
    const derivedNotional = num * executionPrice;
    const derivedMargin = leverage > 0 ? derivedNotional / leverage : derivedNotional;
    setMarginInput(derivedMargin.toFixed(2));
  };

  const handleMarginInput = (newMargin: string) => {
    setLastEdited('margin');
    setMarginInput(newMargin);
    const num = parseFloat(newMargin) || 0;
    syncQuantityFromMargin(num, leverage, executionPrice);
  };

  const handleMarginPreset = (amount: number) => {
    setLastEdited('margin');
    setMarginInput(amount.toString());
    syncQuantityFromMargin(amount, leverage, executionPrice);
  };

  const handlePercentPreset = (percent: number) => {
    setLastEdited('margin');
    const base = availableMargin > 0 ? availableMargin : 2.0;
    const calc = Math.max((base * percent) / 100, 0.1);
    const formatted = parseFloat(calc.toFixed(2)).toString();
    setMarginInput(formatted);
    syncQuantityFromMargin(parseFloat(formatted), leverage, executionPrice);
  };

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

      // Save chosen leverage before submitting
      if (typeof window !== 'undefined') {
        localStorage.setItem(`lucidkeeper_leverage_${market.poolAddress.toLowerCase()}`, leverage.toString());
      }

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

      {/* Margin Collateral Input with Presets */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span className="font-semibold text-slate-300">Margin to Risk</span>
          <span>Avail: {availableMargin.toFixed(2)} USDso</span>
        </div>
        <div className="relative">
          <input
            type="number"
            step="0.5"
            min="0.1"
            value={marginInput}
            onChange={(e) => handleMarginInput(e.target.value)}
            aria-label="Margin amount to risk in USDso"
            className="w-full px-3 py-2 pr-16 rounded-lg bg-[#070a0e] border border-[#1a2536] text-cyan-400 font-mono text-sm font-bold focus:outline-hidden focus:border-cyan-500"
          />
          <span className="absolute right-3 top-2 text-xs font-mono text-cyan-400 font-bold">
            USDso
          </span>
        </div>
        {/* Quick Margin Presets */}
        <div className="grid grid-cols-6 gap-1 font-mono text-[10px]">
          {[2, 5, 10].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => handleMarginPreset(amt)}
              className={`py-1 rounded border text-center font-bold cursor-pointer transition-colors ${
                marginInput === amt.toString()
                  ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                  : 'bg-[#070a0e] hover:bg-slate-800 border-[#1a2536] text-slate-300'
              }`}
            >
              ${amt}
            </button>
          ))}
          {[25, 50, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentPreset(pct)}
              className="py-1 rounded bg-[#070a0e] hover:bg-slate-800 border border-[#1a2536] text-slate-400 hover:text-white text-center cursor-pointer"
            >
              {pct === 100 ? 'Max' : `${pct}%`}
            </button>
          ))}
        </div>
      </div>

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
            onChange={(e) => handleQuantityInput(e.target.value)}
            aria-label={`Order Quantity in ${market.baseSymbol}`}
            className="w-full px-3 py-2 pr-16 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
          />
          <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 font-bold">
            {market.baseSymbol}
          </span>
        </div>
      </div>

      {/* Leverage Slider & Quick Multipliers */}
      <div className="space-y-2 pt-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-slate-400">Leverage (Max {maxLeverage}x)</span>
          <span className="text-cyan-400 font-bold text-sm">{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max={maxLeverage}
          step="1"
          value={leverage}
          onChange={(e) => handleLeverageChange(parseInt(e.target.value, 10))}
          aria-label="Trading leverage multiplier"
          className="w-full accent-cyan-400 cursor-pointer"
        />
        {/* Quick Multipliers */}
        <div className="flex items-center justify-between gap-1 font-mono text-[10px]">
          {[1, 2, 5, 10, Math.min(20, maxLeverage)].map((lev) => (
            <button
              key={lev}
              type="button"
              onClick={() => handleLeverageChange(lev)}
              className={`flex-1 py-1 rounded text-center font-bold transition-all cursor-pointer ${
                leverage === lev
                  ? 'bg-cyan-500 text-black shadow-xs'
                  : 'bg-[#070a0e] hover:bg-slate-800 border border-[#1a2536] text-slate-400 hover:text-white'
              }`}
            >
              {lev}x
            </button>
          ))}
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
