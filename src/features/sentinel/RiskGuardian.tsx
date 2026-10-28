import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert, Volume2, VolumeX, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
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

  // Read real pool parameters from on-chain contract for exact maintenance margin requirement
  const { data: poolParams } = useReadContract({
    address: activePosition?.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getPerpPoolParameters',
    query: {
      enabled: Boolean(activePosition?.poolAddress),
    },
  });

  const maintenanceMarginBps = poolParams?.maintenanceMarginBps
    ? Number(poolParams.maintenanceMarginBps)
    : 250; // Canonical 2.50% default on Tokyo BTC pool

  const [stressPrice, setStressPrice] = useState<number>(
    effectiveMark > 0 ? effectiveMark : (effectiveEntry > 0 ? effectiveEntry : 0)
  );
  const [stopLossPrice, setStopLossPrice] = useState<string>('');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('');
  const [isArmed, setIsArmed] = useState<boolean>(false);
  const [activePanicPercent, setActivePanicPercent] = useState<number | null>(null);
  const [remainingAfterDeRisk, setRemainingAfterDeRisk] = useState<{
    symbol: string;
    remaining: number;
    closed: number;
  } | null>(null);

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

  // 1. Fixed Banner & Dynamic Page Title when Guard is Armed
  useEffect(() => {
    if (isArmed) {
      document.title = `🛡️ [ARMED] LucidKeeper — ${effectiveSymbol} $${formatDynamicPrice(effectiveMark)}`;
    } else {
      document.title = 'LucidKeeper — Perps Terminal on Somnia Tokyo';
    }
  }, [isArmed, effectiveSymbol, effectiveMark]);

  // 2. beforeunload protection while Armed
  useEffect(() => {
    if (!isArmed) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Client-Side Reactive Guard is currently armed. Leaving or refreshing will disarm active price triggers.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isArmed]);

  // Transaction Confirmation Effect
  useEffect(() => {
    if (isConfirmed && hash && notifiedHashRef.current !== hash) {
      notifiedHashRef.current = hash;
      if (soundEnabled) playAlertTone('success');
      if (lastOrderRef.current && address) {
        const o = lastOrderRef.current;
        const previousSize = activePosition?.size || o.size;
        const closedSize = o.size;
        const remaining = Math.max(0, previousSize - closedSize);

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

        if (remaining > 0) {
          setRemainingAfterDeRisk({
            symbol: o.symbol,
            remaining,
            closed: closedSize,
          });
        } else {
          setRemainingAfterDeRisk(null);
        }
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

  // Simulated Stress Math with Real Protocol Maintenance Margin Requirement
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

  // Exact maintenance requirement using on-chain market maintenanceMarginBps
  const simMmReq = simNotional * (maintenanceMarginBps / 10000);
  const healthFactor = simMmReq > 0 ? Math.max(simEquity / simMmReq, 0) : 5.0;

  // Status Classification
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

      const currentMark =
        effectiveMark > 0 ? effectiveMark : activePosition.entryPrice || 1;
      const baseMarkPrice = parseUnits(
        currentMark.toFixed(quoteDecimals > 6 ? 6 : 2),
        quoteDecimals
      );
      const slippagePrice = activePosition.isLong
        ? (baseMarkPrice * 98n) / 100n
        : (baseMarkPrice * 102n) / 100n;
      const rawPrice = quantizeToGrid(slippagePrice, tickSize, 'floor');

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
          !activePosition.isLong,
          0n,
          rawPrice,
          targetExitQuantity,
          expiry,
          2, // IOC Order type
          0, // CANCEL_NEWEST
          zeroAddress,
          0n,
        ],
        gas: 5_000_000n,
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
            `Stop-Loss ($${slNum}) is above current mark ($${formatDynamicPrice(effectiveMark)}). It will trigger immediately!`
          );
        }
      } else {
        if (!isNaN(slNum) && effectiveMark > 0 && slNum <= effectiveMark) {
          toast.warning(
            `Stop-Loss ($${slNum}) is below current mark ($${formatDynamicPrice(effectiveMark)}). It will trigger immediately!`
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

  // Trigger evaluation function
  const evaluateTriggers = useCallback(() => {
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

  // Real-time evaluation loop
  useEffect(() => {
    evaluateTriggers();
  }, [evaluateTriggers]);

  // 3. Tab Visibility Change: Immediate re-evaluation when tab returns to foreground
  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden && isArmed) {
        evaluateTriggers();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isArmed, evaluateTriggers]);

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

  const minStress = effectiveEntry > 0 ? effectiveEntry * 0.7 : 0;
  const maxStress = effectiveEntry > 0 ? effectiveEntry * 1.3 : 1;
  const stepStress = Math.max((maxStress - minStress) / 100, 0.0001);

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-6 space-y-5">
      {/* Active Tab Notice Banner while Armed */}
      {isArmed && (
        <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-xs font-mono text-amber-300 flex items-center justify-between animate-pulse">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>GUARD ARMED (ACTIVE TAB REQUIRED):</strong> Monitoring {effectiveSymbol} mark price triggers locally. Keep this tab open.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-bold uppercase">
            Active
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1a2536] pb-3 gap-2">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-extrabold text-lg text-white">
            Reactive Client-Side Guard (Active Tab Required)
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
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
            Client-Side Execution
          </span>
        </div>
      </div>

      {/* Multi-position selector if more than 1 open position */}
      {positions.length > 1 && (
        <div className="p-2.5 rounded-lg bg-[#070a0e] border border-[#1a2536] flex flex-wrap items-center justify-between gap-2 font-mono text-xs">
          <span className="text-slate-400">Inspecting Position:</span>
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

      {/* Remaining Position Notice after partial Panic De-Risk */}
      {remainingAfterDeRisk && (
        <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/50 flex items-center justify-between text-xs font-mono">
          <div className="text-slate-200">
            <span className="text-emerald-400 font-bold">De-Risk Executed: </span>
            Closed {remainingAfterDeRisk.closed.toFixed(5)} {remainingAfterDeRisk.symbol}. Remaining position:{' '}
            <strong className="text-cyan-400">{remainingAfterDeRisk.remaining.toFixed(5)} {remainingAfterDeRisk.symbol}</strong>.
          </div>
          <button
            onClick={() => handlePanic(100)}
            disabled={isPending || isConfirming}
            className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
          >
            Retry Exit Remaining
          </button>
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

        <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-[#1a2536]">
          * Maintenance Margin Requirement:{' '}
          <span className="text-cyan-400 font-bold">
            {(maintenanceMarginBps / 100).toFixed(2)}%
          </span>{' '}
          (Read directly from on-chain contract parameters)
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
          does <span className="text-amber-400 font-semibold">NOT</span> represent live market fills.
        </p>

        {hasActiveRisk ? (
          <>
            <input
              type="range"
              min={minStress}
              max={maxStress}
              step={stepStress}
              value={stressPrice}
              onChange={(e) => setStressPrice(parseFloat(e.target.value))}
              aria-label="Hypothetical Stress Price Simulator"
              className="w-full accent-cyan-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>-30% (${formatDynamicPrice(minStress)})</span>
              <span>Entry (${formatDynamicPrice(effectiveEntry)})</span>
              <span>+30% (${formatDynamicPrice(maxStress)})</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono border-t border-[#1a2536]">
              <div>
                <span className="text-slate-400">Projected Equity:</span>
                <span className="text-white font-bold ml-2">${simEquity.toFixed(2)} USDso</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Simulated PnL:</span>
                <span
                  className={`font-bold ml-2 ${simPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {simPnl >= 0 ? '+' : ''}${simPnl.toFixed(4)}
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-2 text-center text-xs font-mono text-slate-500">
            No active position open in {effectiveSymbol}. Open a trade to enable live risk simulations.
          </div>
        )}
      </div>

      {/* Reactive SL/TP Trigger Engine Controls */}
      <div className="bg-[#070a0e] border border-[#1a2536] p-4 rounded-xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a2536] pb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold font-mono text-white">
              Reactive SL/TP Trigger Engine ({effectiveSymbol})
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
              isArmed
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 animate-pulse'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isArmed ? 'ARMED (ACTIVE TAB REQUIRED)' : 'DISARMED'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Stop-Loss */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Stop-Loss Trigger (USDso)</span>
              <div className="flex space-x-1">
                {[5, 10, 15].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => applySlPercent(pct)}
                    disabled={!hasActiveRisk}
                    className="px-1.5 py-0.5 rounded bg-[#1a2536] text-[10px] text-rose-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    -{pct}%
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              step="any"
              value={stopLossPrice}
              onChange={(e) => {
                setStopLossPrice(e.target.value);
                saveSlTpState(e.target.value, takeProfitPrice, isArmed);
              }}
              placeholder={effectiveEntry > 0 ? (effectiveEntry * 0.95).toFixed(2) : '0.00'}
              disabled={isArmed || !hasActiveRisk}
              className="w-full px-3 py-2 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono focus:border-rose-500 focus:outline-hidden disabled:opacity-50"
            />
          </div>

          {/* Take-Profit */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-slate-400">
              <span>Take-Profit Trigger (USDso)</span>
              <div className="flex space-x-1">
                {[10, 20, 50].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => applyTpPercent(pct)}
                    disabled={!hasActiveRisk}
                    className="px-1.5 py-0.5 rounded bg-[#1a2536] text-[10px] text-emerald-300 hover:text-white disabled:opacity-40 cursor-pointer"
                  >
                    +{pct}%
                  </button>
                ))}
              </div>
            </div>
            <input
              type="number"
              step="any"
              value={takeProfitPrice}
              onChange={(e) => {
                setTakeProfitPrice(e.target.value);
                saveSlTpState(stopLossPrice, e.target.value, isArmed);
              }}
              placeholder={effectiveEntry > 0 ? (effectiveEntry * 1.15).toFixed(2) : '0.00'}
              disabled={isArmed || !hasActiveRisk}
              className="w-full px-3 py-2 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono focus:border-emerald-500 focus:outline-hidden disabled:opacity-50"
            />
          </div>
        </div>

        {/* Toggle Arm / Disarm */}
        <button
          onClick={handleToggleArm}
          disabled={!hasActiveRisk}
          className={`w-full py-2.5 rounded-lg font-mono text-xs font-extrabold transition-all flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-40 ${
            isArmed
              ? 'bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white border border-rose-500'
              : 'bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500'
          }`}
        >
          {isArmed ? (
            <>
              <ShieldOff className="w-4 h-4" />
              <span>GUARD ARMED (ACTIVE) — CLICK TO DISARM</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>ARM CLIENT-SIDE REACTIVE GUARD</span>
            </>
          )}
        </button>

        <p className="text-[10px] font-mono text-slate-500 text-center">
          * Note: Browser power-saving policies may throttle background timer execution. Keep this browser tab open and active for optimal trigger response.
        </p>
      </div>

      {/* Manual Emergency Exit / De-Risk Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
          Direct On-Chain Emergency Actions
        </span>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={!hasActiveRisk || isPending || isConfirming}
            onClick={() => handlePanic(50)}
            className="py-2.5 px-3 rounded-lg bg-amber-500/15 hover:bg-amber-500 border border-amber-500 text-amber-300 hover:text-black font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 disabled:opacity-40 cursor-pointer"
          >
            <span>
              {activePanicPercent === 50 && (isPending || isConfirming)
                ? 'Executing...'
                : 'De-Risk 50%'}
            </span>
          </button>

          <button
            disabled={!hasActiveRisk || isPending || isConfirming}
            onClick={() => handlePanic(100)}
            className="py-2.5 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-600 border border-rose-500 text-rose-300 hover:text-white font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 disabled:opacity-40 cursor-pointer"
          >
            <span>
              {activePanicPercent === 100 && (isPending || isConfirming)
                ? 'Executing...'
                : 'Panic Exit 100%'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
