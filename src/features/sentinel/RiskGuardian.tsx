import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShieldAlert, Volume2, VolumeX, ShieldCheck, ShieldOff, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits, zeroAddress } from 'viem';
import { perpPoolAbi } from '@/chain/abis';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { formatDynamicPrice, quantizeToGrid } from '@/lib/math/format';
import { iocPrice } from '@/lib/math/ioc';
import { assertOnchainActionAllowed } from '@/lib/operating-policy.mjs';
import { reviewBrowserWrite } from '@/lib/browser-policy';
import { saveTradeHistoryItem } from '@/lib/data/tradeHistory';
import type { PositionItem } from '@/features/portfolio/PositionsTable';
import { TokenLogo } from '@/components/TokenLogo';

interface RiskGuardianProps {
  positions?: PositionItem[];
  selectedSymbol?: string;
  entryPrice?: number;
  currentMarkPrice?: number;
  positionSize?: number;
  marginBalance: number;
  canExecute?: boolean;
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
  canExecute = false,
  onPanicExit,
}) => {
  const { address, isConnected, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: 50383 });
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [inspectedSymbol, setInspectedSymbol] = useState<string>('');

  const activePosition =
    positions.find((p) => p.marketSymbol.toUpperCase() === inspectedSymbol.toUpperCase()) ||
    positions.find((p) => p.marketSymbol.toUpperCase() === selectedSymbol.toUpperCase()) ||
    positions[0];

  const effectiveEntry = activePosition?.entryPrice ?? entryPrice ?? 0;
  const effectiveMark =
    activePosition?.markPrice ?? currentMarkPrice ?? 0;
  const effectiveSize = activePosition ? activePosition.size : (positionSize ?? 0);
  const effectiveIsLong = activePosition ? activePosition.isLong : true;
  const effectiveSymbol = activePosition ? activePosition.marketSymbol : selectedSymbol;

  // Same-block parameters supplied with the position; no maintenance fallback.
  const maintenanceMarginBps = activePosition?.maintenanceMarginBps;
  const poolParams = maintenanceMarginBps !== undefined;

  const [stressPrice, setStressPrice] = useState<number>(
    effectiveMark > 0 ? effectiveMark : effectiveEntry > 0 ? effectiveEntry : 0
  );
  const [stressEdited, setStressEdited] = useState(false);
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
  const { isLoading: isConfirming, data: receipt } = useWaitForTransactionReceipt({
    hash,
  });
  const isConfirmed = receipt?.status === 'success';

  // Keep a user's hypothetical price stable while live marks refresh.
  useEffect(() => setStressEdited(false), [activePosition?.poolAddress]);
  useEffect(() => {
    if (!stressEdited && effectiveMark > 0) {
      setStressPrice(effectiveMark);
    }
  }, [effectiveMark, effectiveSymbol, stressEdited]);

  const storageKey = address && activePosition
    ? `lucidkeeper_sltp_50383_${address.toLowerCase()}_${activePosition.poolAddress.toLowerCase()}`
    : null;

  // Load and sync SL/TP config per active market
  useEffect(() => {
    setIsArmed(false);
    triggeredRef.current = false;
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          const parsed = JSON.parse(saved);
          setStopLossPrice(typeof parsed.stopLoss === 'string' ? parsed.stopLoss : '');
          setTakeProfitPrice(typeof parsed.takeProfit === 'string' ? parsed.takeProfit : '');
          return;
        }
      } catch {
        // Storage is optional. Reload never restores an armed trigger.
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
  }, [storageKey, effectiveEntry, effectiveIsLong]);

  const saveSlTpState = (sl: string, tp: string, armed: boolean) => {
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ stopLoss: sl, takeProfit: tp, armed }));
      } catch { /* Controls remain usable when storage is unavailable. */ }
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
      e.returnValue =
        'Client-Side Reactive Guard is currently armed. Leaving or refreshing will disarm active price triggers.';
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
        saveTradeHistoryItem(address, {
          id: `derisk-${hash}`,
          hash,
          type: 'close',
          marketSymbol: o.symbol,
          side: o.isLong ? 'sell' : 'buy',
          size: o.size,
          price: o.price,
          timestamp: Date.now(),
          description: `De-risk order transaction confirmed (${o.percent}% requested for ${o.symbol}-PERP); actual fill not yet verified`,
        });
      }

      toast.success(
        lastOrderRef.current?.percent === 100
          ? `Full-exit order transaction confirmed for ${lastOrderRef.current?.symbol}`
          : `Partial-exit order transaction confirmed for ${lastOrderRef.current?.symbol}`,
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
  const simEquity = marginBalance + simPnl;
  const simNotional = hasActiveRisk
    ? (stressPrice > 0 ? stressPrice : effectiveEntry) * effectiveSize
    : 0;

  // Exact maintenance requirement using on-chain market maintenanceMarginBps
  const simMmReq = maintenanceMarginBps === undefined ? 0 : simNotional * (maintenanceMarginBps / 10000);
  const healthFactor = simMmReq > 0 ? Math.max(simEquity / simMmReq, 0) : 0;

  // Status Classification
  let status = hasActiveRisk ? 'SIMULATED BUFFER' : 'NO POSITION';
  let statusColor = 'brand-text';
  const gaugePercent = Math.min(Math.max((healthFactor / 5.0) * 100, 5), 100);

  if (hasActiveRisk) {
    if (healthFactor <= 1.05) {
      status = 'LOW SIMULATED BUFFER';
      statusColor = 'caution';
    } else if (healthFactor <= 1.5) {
      status = 'REDUCED SIMULATED BUFFER';
      statusColor = 'caution';
    }
  }

  // Real On-Chain Emergency Panic Execution (De-Risk 50% or Panic Exit 100%)
  const handlePanic = async (percent: number) => {
    if (!canExecute || effectiveMark <= 0) return;
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }
    if (!activePosition || activePosition.size <= 0) {
      toast.error(`No active position open in ${effectiveSymbol} to de-risk.`);
      return;
    }

    try {
      if (!address || !publicClient) throw new Error('Configured signer unavailable');
      assertOnchainActionAllowed('order', { chainId: chainId!, wallet: address });
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

      const currentMark = effectiveMark;
      if (activePosition.markPriceRaw === null) throw new Error('Current raw mark unavailable');
      const rawPrice = iocPrice(activePosition.markPriceRaw, tickSize, !activePosition.isLong);

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 300) * 1_000_000_000n;

      lastOrderRef.current = {
        symbol: effectiveSymbol,
        isLong: activePosition.isLong,
        size: activePosition.size * (percent / 100),
        price: currentMark,
        percent,
      };

      const request = {
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
      } as const;
      const reviewed = await reviewBrowserWrite(publicClient, request, 'order', address, { market: `${effectiveSymbol}-PERP`, size: formatUnits(targetExitQuantity, baseDecimals), description: `Request ${percent}% Guardian reduction by IOC; requires wallet approval, not autonomous signing.` });
      assertOnchainActionAllowed('order', { chainId: chainId!, wallet: address });
      await writeContractAsync({ ...request, ...reviewed });

      toast.info(
        `De-risk order submitted (${percent}% requested). Awaiting transaction confirmation…`
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
    if (!isArmed && (!hasActiveRisk || !canExecute || effectiveMark <= 0)) {
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
      !canExecute ||
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
          description:
            'Requesting a full-exit order in your wallet. Execution depends on approval and liquidity.',
          duration: 10000,
        });
      } else {
        toast.success(
          `🎯 REACTIVE TAKE-PROFIT TRIGGERED at $${formatDynamicPrice(effectiveMark)}!`,
          {
            description:
              'Requesting a full-exit order in your wallet. Execution depends on approval and liquidity.',
            duration: 10000,
          }
        );
      }

      handlePanic(100);
    }
  }, [
    isArmed,
    canExecute,
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
    <div className="guardian-controls">
      {/* Active Tab Notice Banner while Armed */}
      {isArmed && (
        <div className="guardian-notice" role="status">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>GUARD ARMED (ACTIVE TAB REQUIRED):</strong> Monitoring {effectiveSymbol} mark
              price triggers locally. Keep this tab open.
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 font-bold uppercase">
            Active
          </span>
        </div>
      )}

      {/* Header */}
      <div className="guardian-controls-heading">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-4 h-4 brand-text" aria-hidden="true" />
          <h3 className="font-display font-extrabold text-lg text-white">
            Browser-local risk controls
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="icon-button"
            aria-pressed={soundEnabled}
            title={soundEnabled ? 'Mute Alerts' : 'Unmute Alerts'}
            aria-label={soundEnabled ? 'Mute alerts' : 'Unmute alerts'}
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-cyan-400" />
            ) : (
              <VolumeX className="w-4 h-4" />
            )}
          </button>
          <span className="eyebrow">
            Wallet approval required
          </span>
        </div>
      </div>

      {/* Multi-position selector if more than 1 open position */}
      {positions.length > 1 && (
        <div className="guardian-position-picker">
          <span className="text-slate-400">Inspecting Position:</span>
          <div className="flex items-center space-x-1.5">
            {positions.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setInspectedSymbol(p.marketSymbol);
                  setStressPrice(p.markPrice || p.entryPrice);
                }}
                aria-pressed={effectiveSymbol === p.marketSymbol}
                className="button guardian-button"
              >
                <TokenLogo symbol={p.marketSymbol} size={18} />
                {p.marketSymbol} ({p.isLong ? 'Long' : 'Short'})
              </button>
            ))}
          </div>
        </div>
      )}

      {hash && (
        <p className="transaction-status" role="status">
          {receipt?.status === 'reverted'
            ? 'Transaction reverted'
            : isConfirmed
              ? 'Transaction confirmed · check refreshed positions for actual fills'
              : 'Submitted · awaiting receipt'}{' '}
          ·{' '}
          <a
            href={`https://explorer.testnet.somnia.network/tokyo/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View transaction ↗
          </a>
        </p>
      )}

      <div className="guardian-stress">
      {/* Selected-market scenario, distinct from the overview's portfolio health. */}
      <div className="guardian-control-section space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-slate-300 font-semibold flex items-center space-x-2">
            <span>Stress ratio ({effectiveSymbol}):</span>
          </span>
          <span className={`font-bold text-sm ${hasActiveRisk && poolParams ? statusColor : 'muted'}`}>
            {hasActiveRisk && poolParams
              ? `${healthFactor.toFixed(2)}× (${status})`
              : 'Unavailable'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden flex">
          <div
            className="guardian-stress-bar"
            data-warning={healthFactor <= 1.5}
            style={{ width: `${hasActiveRisk && poolParams ? gaugePercent : 0}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[11px] font-mono text-slate-400">
          <span>Low (&lt;1.0×)</span>
          <span>Reduced (1.5×)</span>
          <span>Higher (&gt;2.5×)</span>
        </div>

        <div className="text-[10px] font-mono text-slate-500 pt-1 border-t border-[#1a2536]">
          * Maintenance Margin Requirement:{' '}
          <span className="text-cyan-400 font-bold">
            {maintenanceMarginBps !== undefined ? `${(maintenanceMarginBps / 100).toFixed(2)}%` : 'Unavailable'}
          </span>{' '}
          (Selected-market approximation; excludes other positions)
        </div>
      </div>

      {/* Price Stress Testing Simulator */}
      <div className="guardian-control-section space-y-3">
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
          Unlocked collateral plus this position’s hypothetical PnL. Excludes other positions,
          funding and exit fees. This is a scenario, not portfolio health or a fill forecast.
        </p>

        {hasActiveRisk ? (
          <>
            <input
              type="range"
              min={minStress}
              max={maxStress}
              step={stepStress}
              value={stressPrice}
              onChange={(e) => { setStressEdited(true); setStressPrice(parseFloat(e.target.value)); }}
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
                <span className="text-slate-400">Scenario equity:</span>
                <span className="text-white font-bold ml-2">${simEquity.toFixed(2)} USDso</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Simulated PnL:</span>
                <span
                  className={`font-bold ml-2 ${simPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}
                >
                  {simPnl >= 0 ? '+' : ''}{simPnl.toFixed(4)} USDso
                </span>
              </div>
            </div>
          </>
        ) : (
          <div className="py-2 text-center text-xs font-mono text-slate-500">
            No active position in {effectiveSymbol}. Stress estimates require a position.
          </div>
        )}
      </div>
      </div>

      {/* Reactive SL/TP Trigger Engine Controls */}
      <div className="guardian-triggers">
      <div className="guardian-control-section space-y-4">
        <div className="flex items-center justify-between border-b border-[#1a2536] pb-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold font-mono text-white">
              Reactive SL/TP Trigger Engine ({effectiveSymbol})
            </span>
          </div>
          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded border font-bold ${
              isArmed
                 ? 'brand-text border-violet-500'
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
                    disabled={!hasActiveRisk || isArmed}
                    aria-label={`Stop loss ${pct}% from entry`}
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
              aria-label="Stop-loss trigger in USDso"
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
                    disabled={!hasActiveRisk || isArmed}
                    aria-label={`Take profit ${pct}% from entry`}
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
              aria-label="Take-profit trigger in USDso"
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
          disabled={!isArmed && (!hasActiveRisk || !canExecute)}
           className="button button-primary guardian-arm"
           aria-pressed={isArmed}
        >
          {isArmed ? (
            <>
              <ShieldOff className="w-4 h-4" />
              <span>GUARD ARMED (ACTIVE) — CLICK TO DISARM</span>
            </>
          ) : (
            <>
               <ShieldCheck className="w-4 h-4" />
              <span>ARM CLIENT-SIDE REACTIVE GUARD</span>
            </>
          )}
        </button>

        <p className="text-[10px] font-mono text-slate-500 text-center">
          Keep this tab active. Background throttling can delay triggers. Reloading, switching
          accounts or networks disarms the guard; each exit still needs wallet approval.
        </p>
      </div>

      {/* Manual Emergency Exit / De-Risk Buttons */}
      <div className="space-y-2">
        <span className="text-[11px] font-mono text-slate-400 font-bold uppercase tracking-wider">
           Reduce position · IOC orders
        </span>
        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={
              !hasActiveRisk || !canExecute || effectiveMark <= 0 || isPending || isConfirming
            }
            onClick={() => handlePanic(50)}
             className="button guardian-button"
          >
            <span>
              {activePanicPercent === 50 && (isPending || isConfirming)
                 ? (isPending ? 'Awaiting wallet…' : 'Confirming…')
                : 'De-Risk 50%'}
            </span>
          </button>

          <button
            disabled={
              !hasActiveRisk || !canExecute || effectiveMark <= 0 || isPending || isConfirming
            }
            onClick={() => handlePanic(100)}
             className="button guardian-button"
          >
            <span>
              {activePanicPercent === 100 && (isPending || isConfirming)
                 ? (isPending ? 'Awaiting wallet…' : 'Confirming…')
                : 'Panic Exit 100%'}
            </span>
          </button>
        </div>
        <p className="form-note">Percentages request a lot-rounded exit. Confirmation does not guarantee a full fill.</p>
      </div>
      </div>
    </div>
  );
};
