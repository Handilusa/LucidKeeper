import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, AlertTriangle, Zap, Volume2, VolumeX, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { perpPoolAbi } from '@/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { formatDynamicPrice, quantizeToGrid } from '@/lib/math/format';
import { saveTradeHistoryItem } from '@/lib/data/tradeHistory';
import type { PositionItem } from '@/features/portfolio/PositionsTable';

interface RiskGuardianProps {
  positions?: PositionItem[];
  selectedSymbol?: string;
  entryPrice?: number;
  currentMarkPrice?: number;
  positionSize?: number;
  marginBalance: number;
  onPanicExit?: (percent: number, pos?: PositionItem) => void;
}

function playAlertTone(type: 'danger' | 'success') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'danger') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.35);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.25);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    }
  } catch {
    // Ignored if browser blocks audio autoplay
  }
}

export const RiskGuardian: React.FC<RiskGuardianProps> = ({
  positions = [],
  selectedSymbol = 'BTC',
  entryPrice,
  currentMarkPrice,
  positionSize,
  marginBalance,
  onPanicExit,
}) => {
  const { address, isConnected } = useAccount();
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inspectedSymbol, setInspectedSymbol] = useState<string>('');

  const activePosition =
    positions.find((p) => p.marketSymbol.toUpperCase() === inspectedSymbol.toUpperCase()) ||
    positions.find((p) => p.marketSymbol.toUpperCase() === selectedSymbol.toUpperCase()) ||
    positions[0];

  const effectiveEntry = activePosition?.entryPrice ?? (entryPrice ?? 0);
  const effectiveMark =
    activePosition?.markPrice ??
    (currentMarkPrice ?? (effectiveEntry > 0 ? effectiveEntry : 0));
  const effectiveSize = activePosition ? activePosition.size : (positionSize ?? 0);
  const effectiveIsLong = activePosition ? activePosition.isLong : true;
  const effectiveSymbol = activePosition ? activePosition.marketSymbol : selectedSymbol;

  const [stressPrice, setStressPrice] = useState<number>(
    effectiveMark > 0 ? effectiveMark : (effectiveEntry > 0 ? effectiveEntry : 0)
  );
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [activePanicPercent, setActivePanicPercent] = useState<number | null>(null);

  const triggeredRef = useRef<boolean>(false);
  const notifiedHashRef = useRef<string | null>(null);
  const lastOrderRef = useRef<{
    symbol: string;
    isLong: boolean;
    size: number;
    price: number;
    percent: number;
  } | null>(null);

  // Wagmi On-Chain Contract Execution
  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Sync stress simulator price on mark price changes
  useEffect(() => {
    if (effectiveMark > 0) {
      setStressPrice(effectiveMark);
    }
  }, [effectiveMark, effectiveSymbol]);

  // Load and sync SL/TP config per active market
  useEffect(() => {
    if (activePosition && typeof window !== 'undefined') {
      const saved = localStorage.getItem(
        `lucidkeeper_sltp_${activePosition.poolAddress.toLowerCase()}`
      );
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.stopLoss !== undefined) setStopLossPrice(parsed.stopLoss);
          if (parsed.takeProfit !== undefined) setTakeProfitPrice(parsed.takeProfit);
          if (parsed.armed !== undefined) setIsArmed(Boolean(parsed.armed));
          return;
        } catch {
          // ignore parse error
        }
      }
    }

    if (effectiveEntry > 0) {
      const defaultSl = effectiveIsLong ? effectiveEntry * 0.95 : effectiveEntry * 1.05;
      const defaultTp = effectiveIsLong ? effectiveEntry * 1.15 : effectiveEntry * 0.85;
      setStopLossPrice(defaultSl < 1 ? defaultSl.toFixed(4) : defaultSl.toFixed(2));
      setTakeProfitPrice(defaultTp < 1 ? defaultTp.toFixed(4) : defaultTp.toFixed(2));
      setIsArmed(false);
    } else {
      setStopLossPrice('');
      setTakeProfitPrice('');
      setIsArmed(false);
    }
  }, [activePosition?.poolAddress, effectiveEntry, effectiveIsLong]);

  const saveSlTpState = (sl: string, tp: string, armed: boolean) => {
    if (activePosition && typeof window !== 'undefined') {
      localStorage.setItem(
        `lucidkeeper_sltp_${activePosition.poolAddress.toLowerCase()}`,
        JSON.stringify({ stopLoss: sl, takeProfit: tp, armed })
      );
    }
  };

  // Transaction Confirmation Effect
  useEffect(() => {
    if (isConfirmed && hash && notifiedHashRef.current !== hash) {
      notifiedHashRef.current = hash;
      if (soundEnabled) playAlertTone('success');
      if (lastOrderRef.current && address) {
        const o = lastOrderRef.current;
        saveTradeHistoryItem(address, {
          id: `derisk-${hash}`,
          hash,
          type: 'close',
          marketSymbol: o.symbol,
          side: o.isLong ? 'sell' : 'buy',
          size: o.size,
          price: o.price,
          timestamp: Date.now(),
          description: `Emergency De-Risk (${o.percent}% exit for ${o.symbol}-PERP via IOC)`,
        });
      }
      toast.success(
        lastOrderRef.current?.percent === 100
          ? `Panic Exit 100% confirmed on Somnia Tokyo for ${lastOrderRef.current?.symbol}!`
          : `De-Risk 50% confirmed on Somnia Tokyo for ${lastOrderRef.current?.symbol}!`,
        {
          id: `derisk-confirmed-${hash}`,
          description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
        }
      );
      setActivePanicPercent(null);
      onPanicExit?.(lastOrderRef.current?.percent || 100, activePosition);
    }
  }, [isConfirmed, hash, address, soundEnabled, onPanicExit, activePosition]);

  // Simulated Stress Math
  const hasActiveRisk = Boolean(activePosition && activePosition.size > 0 && effectiveEntry > 0);
  const simPnl =
    hasActiveRisk && stressPrice > 0
      ? effectiveIsLong
        ? (stressPrice - effectiveEntry) * effectiveSize
        : (effectiveEntry - stressPrice) * effectiveSize
      : 0;
  const simEquity = Math.max(0, marginBalance + simPnl);
  const simNotional = hasActiveRisk
    ? (stressPrice > 0 ? stressPrice : effectiveEntry) * effectiveSize
    : 0;
  const simMmReq = simNotional * 0.05; // 5% maintenance
  const healthFactor = simMmReq > 0 ? Math.max(simEquity / simMmReq, 0) : 5.0;

  // Status Level
  let status = hasActiveRisk ? 'SAFE' : 'STANDBY (NO RISK)';
  let statusColor = 'text-emerald-400';
  let barGradient = 'from-emerald-500 to-cyan-400';
  const gaugePercent = Math.min(Math.max((healthFactor / 5.0) * 100, 5), 100);

  if (hasActiveRisk) {
    if (healthFactor <= 1.05) {
      status = 'CRITICAL DANGER (LIQUIDATION)';
      statusColor = 'text-rose-500 animate-pulse';
      barGradient = 'from-rose-600 to-rose-400';
    } else if (healthFactor <= 1.5) {
      status = 'HIGH RISK (MARGIN CALL)';
      statusColor = 'text-amber-400';
      barGradient = 'from-amber-600 to-amber-400';
    }
  }

  // Real On-Chain Emergency Panic Execution (De-Risk 50% or Panic Exit 100%)
  const handlePanic = async (percent: number) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!activePosition || activePosition.size <= 0) {
      toast.error(`No active position open in ${effectiveSymbol} to de-risk.`);
      return;
    }

    try {
      setActivePanicPercent(percent);
      const actionName = activePosition.isLong ? 'Sell IOC' : 'Buy IOC';
      toast.info(
        `Submitting Panic De-Risk (${percent}% exit via ${actionName}) for ${effectiveSymbol}-PERP to Somnia Tokyo...`
      );

      const marketMeta = ALL_VERIFIED_PERP_MARKETS.find(
        (m) => m.poolAddress.toLowerCase() === activePosition.poolAddress.toLowerCase()
      );
      const baseDecimals = activePosition.baseDecimals || marketMeta?.baseDecimals || 8;
      const quoteDecimals = activePosition.quoteDecimals || marketMeta?.quoteDecimals || 18;

      const lotSize = marketMeta?.lotSize
        ? parseUnits(marketMeta.lotSize, baseDecimals)
        : parseUnits('0.00001', baseDecimals);
      const tickSize = marketMeta?.tickSize
        ? parseUnits(marketMeta.tickSize, quoteDecimals)
        : parseUnits('0.00001', quoteDecimals);

      // Quantize order size
      const rawFullSize = parseUnits(activePosition.size.toString(), baseDecimals);
      let targetExitQuantity =
        percent === 100 ? rawFullSize : (rawFullSize * BigInt(percent)) / 100n;
      targetExitQuantity = quantizeToGrid(targetExitQuantity, lotSize, 'floor');

      if (targetExitQuantity <= 0n) {
        toast.error(
          `Position size (${activePosition.size} ${effectiveSymbol}) is too small to split ${percent}%. Execute Panic Exit 100% instead.`
        );
        setActivePanicPercent(null);
        return;
      }

      // 2% crossing slippage ceiling/floor snapped to tickSize
      const currentMark =
        effectiveMark > 0 ? effectiveMark : (activePosition.entryPrice || 1);
      const baseMarkPrice = parseUnits(
        currentMark.toFixed(quoteDecimals > 6 ? 6 : 2),
        quoteDecimals
      );
      const slippagePrice = activePosition.isLong
        ? (baseMarkPrice * 98n) / 100n
        : (baseMarkPrice * 102n) / 100n;
      const rawPrice = quantizeToGrid(slippagePrice, tickSize, 'floor');

      // Expiry: 10 minutes buffer in nanoseconds
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;

      lastOrderRef.current = {
        symbol: effectiveSymbol,
        isLong: activePosition.isLong,
        size: activePosition.size * (percent / 100),
        price: currentMark,
        percent,
      };

      await writeContractAsync({
        chainId: 50383,
        address: activePosition.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [
          !activePosition.isLong, // Opposite direction: false = sell to exit long, true = buy to exit short
          0n, // userData
          rawPrice,
          targetExitQuantity,
          expiry,
          2, // IOC Order type
          0, // CANCEL_NEWEST
          zeroAddress,
          0n,
        ],
        gas: 5_000_000n, // Safe gas limit: guarantees OKX and Metamask calculate fee instantly
      });

      toast.success(
        `Panic De-Risk (${percent}%) order placed! Awaiting Somnia Tokyo confirmation...`
      );
    } catch (err: unknown) {
      console.error('Panic exit error:', err);
      setActivePanicPercent(null);
      const e = err as { shortMessage?: string; message?: string };
      toast.error(`Failed to execute Panic De-Risk for ${effectiveSymbol}`, {
        description: e?.shortMessage || e?.message || 'Transaction reverted',
      });
    }
  };

  // Toggle Arming for Reactive SL/TP
  const handleToggleArm = () => {
    if (!hasActiveRisk) {
      toast.error(`No open position in ${effectiveSymbol} to protect with Reactive SL/TP.`);
      return;
    }

    const slNum = parseFloat(stopLossPrice);
    const tpNum = parseFloat(takeProfitPrice);

    if (!isArmed) {
      if ((isNaN(slNum) || slNum <= 0) && (isNaN(tpNum) || tpNum <= 0)) {
        toast.error('Please configure a valid Stop-Loss or Take-Profit price first.');
        return;
      }

      if (effectiveIsLong) {
        if (!isNaN(slNum) && effectiveMark > 0 && slNum >= effectiveMark) {
          toast.warning(
            `Stop-Loss ($${slNum}) is above current mark ($${formatDynamicPrice(effectiveMark)}). It would trigger immediately!`
          );
        }
      } else {
        if (!isNaN(slNum) && effectiveMark > 0 && slNum <= effectiveMark) {
          toast.warning(
            `Stop-Loss ($${slNum}) is below current mark ($${formatDynamicPrice(effectiveMark)}). It would trigger immediately!`
          );
        }
      }

      setIsArmed(true);
      triggeredRef.current = false;
      saveSlTpState(stopLossPrice, takeProfitPrice, true);
      if (soundEnabled) playAlertTone('success');
      toast.success(`🛡️ Reactive SL/TP Armed for ${effectiveSymbol}!`, {
        description: `Monitoring price triggers locally while this browser tab remains active.`,
      });
    } else {
      setIsArmed(false);
      triggeredRef.current = false;
      saveSlTpState(stopLossPrice, takeProfitPrice, false);
      toast.info(`Reactive SL/TP Disarmed for ${effectiveSymbol}`);
    }
  };

  // Preset percentage buttons
  const applySlPercent = (pct: number) => {
    if (effectiveEntry <= 0) return;
    const factor = effectiveIsLong ? 1 - pct / 100 : 1 + pct / 100;
    const val = (effectiveEntry * factor).toFixed(effectiveEntry < 1 ? 4 : 2);
    setStopLossPrice(val);
    saveSlTpState(val, takeProfitPrice, isArmed);
  };

  const applyTpPercent = (pct: number) => {
    if (effectiveEntry <= 0) return;
    const factor = effectiveIsLong ? 1 + pct / 100 : 1 - pct / 100;
    const val = (effectiveEntry * factor).toFixed(effectiveEntry < 1 ? 4 : 2);
    setTakeProfitPrice(val);
    saveSlTpState(stopLossPrice, val, isArmed);
  };

  // Real-time Reactive SL/TP Trigger Engine
  useEffect(() => {
    if (
      !isArmed ||
      !hasActiveRisk ||
      triggeredRef.current ||
      isPending ||
      isConfirming ||
      effectiveMark <= 0
    ) {
      return;
    }

    const sl = parseFloat(stopLossPrice);
    const tp = parseFloat(takeProfitPrice);

    let triggeredType: 'SL' | 'TP' | null = null;

    if (effectiveIsLong) {
      if (!isNaN(sl) && sl > 0 && effectiveMark <= sl) {
        triggeredType = 'SL';
      } else if (!isNaN(tp) && tp > 0 && effectiveMark >= tp) {
        triggeredType = 'TP';
      }
    } else {
      if (!isNaN(sl) && sl > 0 && effectiveMark >= sl) {
        triggeredType = 'SL';
      } else if (!isNaN(tp) && tp > 0 && effectiveMark <= tp) {
        triggeredType = 'TP';
      }
    }

    if (triggeredType) {
      triggeredRef.current = true;
      setIsArmed(false);
      saveSlTpState(stopLossPrice, takeProfitPrice, false);
      if (soundEnabled) playAlertTone('danger');

      if (triggeredType === 'SL') {
        toast.error(`🚨 REACTIVE STOP-LOSS TRIGGERED at $${formatDynamicPrice(effectiveMark)}!`, {
          description: `Executing immediate 100% Panic Exit on Somnia Tokyo to defend collateral!`,
          duration: 10000,
        });
      } else {
        toast.success(`🎯 REACTIVE TAKE-PROFIT TRIGGERED at $${formatDynamicPrice(effectiveMark)}!`, {
          description: `Executing 100% Panic Exit on Somnia Tokyo to lock in gains!`,
          duration: 10000,
        });
      }

      handlePanic(100);
    }
  }, [
    isArmed,
    hasActiveRisk,
    effectiveMark,
    effectiveIsLong,
    stopLossPrice,
    takeProfitPrice,
    isPending,
    isConfirming,
    soundEnabled,
  ]);

  const minStress = effectiveEntry > 0 ? effectiveEntry * 0.7 : 0;
  const maxStress = effectiveEntry > 0 ? effectiveEntry * 1.3 : 1;
  const stepStress = Math.max((maxStress - minStress) / 100, 0.0001);

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1a2536] pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-extrabold text-lg text-white">
            LucidKeeper Risk Engine
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 cursor-pointer"
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            Autonomous Protection
          </span>
        </div>
      </div>

      {/* Multi-position selector if more than 1 open position */}
      {positions.length > 1 && (
        <div className="p-2.5 rounded-lg bg-[#070a0e] border border-[#1a2536] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <span className="text-slate-400">Inspecting Active Position:</span>
          <div className="flex items-center space-x-1.5">
            {positions.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setInspectedSymbol(p.marketSymbol);
                  setStressPrice(p.markPrice || p.entryPrice);
                }}
                className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                  effectiveSymbol === p.marketSymbol
                    ? 'bg-cyan-500 text-black shadow-xs'
                    : 'bg-[#1a2536] text-slate-300 hover:text-white'
                }`}
              >
                {p.marketSymbol} ({p.isLong ? 'Long' : 'Short'})
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Health Factor Gauge HUD */}
      <div className="bg-[#070a0e] border border-[#1a2536] p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-slate-300 font-semibold flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>HEALTH FACTOR ({effectiveSymbol}):</span>
          </span>
          <span className={`font-bold text-sm ${statusColor}`}>
            {healthFactor.toFixed(2)}x ({status})
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
          <div
            className={`bg-gradient-to-r ${barGradient} h-3 rounded-full transition-all duration-300`}
            style={{ width: `${gaugePercent}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Close-Out (&lt;1.0x)</span>
          <span>Margin Call (1.5x)</span>
          <span>Safe (&gt;2.5x)</span>
        </div>
      </div>

      {/* Price Stress Testing Simulator */}
      <div className="space-y-3 bg-[#070a0e]/80 border border-[#1a2536] p-4 rounded-xl">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-bold">Hypothetical Stress Simulator:</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] uppercase font-bold">
              What-If Simulation Only
            </span>
          </div>
          <span className="text-cyan-400 font-bold">
            {stressPrice > 0 ? `$${formatDynamicPrice(stressPrice)} USDso` : '--'}
          </span>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
          * This predictive slider models hypothetical margin outcomes under extreme market
          volatility. It calculates projected equity and margin ratios based on protocol math; it
          does <span className="text-amber-400 font-semibold">NOT</span> represent live market
          fills.
        </p>

        <input
          type="range"
          min={minStress}
          max={maxStress}
          step={stepStress}
          value={stressPrice}
          disabled={!hasActiveRisk}
          onChange={(e) => setStressPrice(parseFloat(e.target.value))}
          aria-label="Simulated stress test market price"
          className="w-full accent-cyan-400 cursor-pointer disabled:opacity-40"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>{minStress > 0 ? `$${formatDynamicPrice(minStress)} (-30%)` : '--'}</span>
          <span>Entry: {effectiveEntry > 0 ? `$${formatDynamicPrice(effectiveEntry)}` : '--'}</span>
          <span>{maxStress > 0 ? `$${formatDynamicPrice(maxStress)} (+30%)` : '--'}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1a2536]/80 text-xs font-mono">
          <div>
            <span className="text-slate-400">Simulated PnL:</span>{' '}
            <span className={`font-bold ${simPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {simPnl >= 0 ? '+' : ''}${simPnl.toFixed(4)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-slate-400">Simulated Equity:</span>{' '}
            <span className="text-white font-bold">${simEquity.toFixed(2)} USDso</span>
          </div>
        </div>
      </div>

      {/* Panic De-Risk & SL/TP Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Emergency Panic Actions */}
        <div className="space-y-2 p-3.5 rounded-lg bg-[#070a0e] border border-[#1a2536]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-slate-300 font-bold">
              Emergency De-Risk Actions ({effectiveSymbol})
            </label>
            <span className="text-[10px] font-mono text-slate-400">
              {hasActiveRisk ? `${effectiveSize} ${effectiveSymbol}` : 'No Position'}
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Immediate market IOC exit executed on-chain to protect MarginBank collateral.
          </p>
          <div className="flex space-x-2 pt-1">
            <button
              onClick={() => handlePanic(50)}
              disabled={!hasActiveRisk || isPending || isConfirming}
              className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-500/50 text-amber-300 hover:text-black font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {activePanicPercent === 50 && (isPending || isConfirming) ? (
                <span className="flex items-center space-x-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Confirming...</span>
                </span>
              ) : (
                <>
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>De-Risk 50%</span>
                </>
              )}
            </button>
            <button
              onClick={() => handlePanic(100)}
              disabled={!hasActiveRisk || isPending || isConfirming}
              className="flex-1 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500 border border-rose-500 text-rose-300 hover:text-white font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
            >
              {activePanicPercent === 100 && (isPending || isConfirming) ? (
                <span className="flex items-center space-x-1.5">
                  <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                  <span>Confirming...</span>
                </span>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5" />
                  <span>Panic Exit 100%</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Client-Side Reactive SL/TP Configuration */}
        <div className="space-y-2 p-3.5 rounded-lg bg-[#070a0e] border border-[#1a2536]">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono text-slate-300 font-bold flex items-center space-x-1.5">
              <span>Client-Side Reactive SL/TP</span>
              {isArmed && (
                <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-mono animate-pulse">
                  ACTIVE
                </span>
              )}
            </label>
            <span className="text-[10px] font-mono text-cyan-400">
              Mark: ${formatDynamicPrice(effectiveMark)}
            </span>
          </div>

          <div className="space-y-1.5">
            {/* Stop Loss Input & Quick Presets */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span className="text-rose-400 font-semibold">Stop-Loss Price</span>
                <div className="flex space-x-1">
                  {[5, 10, 15].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      disabled={!hasActiveRisk}
                      onClick={() => applySlPercent(pct)}
                      className="px-1.5 py-0.5 rounded bg-[#1a2536] hover:bg-rose-500/30 text-rose-300 text-[9px] font-mono transition-colors cursor-pointer disabled:opacity-30"
                    >
                      {effectiveIsLong ? `-${pct}%` : `+${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="Stop-Loss Price in USDso"
                  aria-label="Stop-Loss Price in USDso"
                  value={stopLossPrice}
                  onChange={(e) => {
                    setStopLossPrice(e.target.value);
                    saveSlTpState(e.target.value, takeProfitPrice, isArmed);
                  }}
                  className="w-full px-2.5 py-1.5 pr-14 rounded-lg bg-[#0d131d] border border-[#1a2536] text-rose-400 font-mono text-xs focus:outline-hidden focus:border-rose-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500">
                  USDso
                </span>
              </div>
            </div>

            {/* Take Profit Input & Quick Presets */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                <span className="text-emerald-400 font-semibold">Take-Profit Price</span>
                <div className="flex space-x-1">
                  {[10, 20, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      disabled={!hasActiveRisk}
                      onClick={() => applyTpPercent(pct)}
                      className="px-1.5 py-0.5 rounded bg-[#1a2536] hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-mono transition-colors cursor-pointer disabled:opacity-30"
                    >
                      {effectiveIsLong ? `+${pct}%` : `-${pct}%`}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  placeholder="Take-Profit Price in USDso"
                  aria-label="Take-Profit Price in USDso"
                  value={takeProfitPrice}
                  onChange={(e) => {
                    setTakeProfitPrice(e.target.value);
                    saveSlTpState(stopLossPrice, e.target.value, isArmed);
                  }}
                  className="w-full px-2.5 py-1.5 pr-14 rounded-lg bg-[#0d131d] border border-[#1a2536] text-emerald-400 font-mono text-xs focus:outline-hidden focus:border-emerald-500"
                />
                <span className="absolute right-2.5 top-1.5 text-[10px] font-mono text-slate-500">
                  USDso
                </span>
              </div>
            </div>
          </div>

          {/* Arm / Disarm Toggle Button */}
          <button
            onClick={handleToggleArm}
            disabled={!hasActiveRisk}
            className={`w-full py-2 px-3 rounded-lg font-display font-bold text-xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isArmed
                ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg glow-emerald'
                : 'bg-cyan-500/20 hover:bg-cyan-500 border border-cyan-500/50 text-cyan-300 hover:text-black'
            }`}
          >
            {isArmed ? (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>GUARD ARMED (ACTIVE) — CLICK TO DISARM</span>
              </>
            ) : (
              <>
                <ShieldOff className="w-4 h-4" />
                <span>ARM CLIENT-SIDE REACTIVE GUARD</span>
              </>
            )}
          </button>

          <p className="text-[9px] text-amber-400/90 font-mono pt-1">
            ⚠️ <strong>Active Tab Required:</strong> Monitors live on-chain price triggers and
            dispatches market exit IOC orders automatically while this tab is active.
          </p>
        </div>
      </div>
    </div>
  );
};
