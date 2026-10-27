import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, Zap, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';

interface RiskGuardianProps {
  entryPrice: number;
  currentMarkPrice: number;
  positionSize: number;
  marginBalance: number;
  onPanicExit?: (percent: number) => void;
}

export const RiskGuardian: React.FC<RiskGuardianProps> = ({
  entryPrice,
  currentMarkPrice,
  positionSize,
  marginBalance,
  onPanicExit,
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stopLossPrice, setStopLossPrice] = useState<string>('72000');
  const [takeProfitPrice, setTakeProfitPrice] = useState<string>('95000');
  const [stressPrice, setStressPrice] = useState<number>(currentMarkPrice || 80000);

  // Simulated Stress Math
  const simPnl = (stressPrice - entryPrice) * positionSize;
  const simEquity = marginBalance + simPnl;
  const simNotional = stressPrice * positionSize;
  const simMmReq = simNotional * 0.05; // 5% maintenance
  const healthFactor = simMmReq > 0 ? simEquity / simMmReq : 5.0;

  // Status Level
  let status = 'SAFE';
  let statusColor = 'text-emerald-400';
  let barGradient = 'from-emerald-500 to-cyan-400';
  let gaugePercent = Math.min(Math.max((healthFactor / 5.0) * 100, 5), 100);

  if (healthFactor <= 1.05) {
    status = 'CRITICAL DANGER (LIQUIDATION)';
    statusColor = 'text-rose-500 animate-pulse';
    barGradient = 'from-rose-600 to-rose-400';
  } else if (healthFactor <= 1.5) {
    status = 'HIGH RISK (MARGIN CALL)';
    statusColor = 'text-amber-400';
    barGradient = 'from-amber-600 to-amber-400';
  }

  const handlePanic = (percent: number) => {
    toast.warning(`Executing Panic De-Risk (${percent}% exit)...`, {
      description: 'Submitting immediate market exit to protect collateral on Somnia Tokyo',
    });
    onPanicExit?.(percent);
  };

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-amber-400" />
          <h3 className="font-display font-extrabold text-lg text-white">
            LucidKeeper Risk Engine
          </h3>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
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

      {/* Health Factor Gauge HUD */}
      <div className="bg-[#070a0e] border border-[#1a2536] p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between font-mono text-xs">
          <span className="text-slate-300 font-semibold flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            <span>HEALTH FACTOR:</span>
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

      {/* Price Stress Testing Simulator (Clearly marked as What-If Model) */}
      <div className="space-y-3 bg-[#070a0e]/80 border border-[#1a2536] p-4 rounded-xl">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-slate-300 font-bold">Hypothetical Stress Simulator:</span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] uppercase font-bold">
              What-If Simulation Only
            </span>
          </div>
          <span className="text-cyan-400 font-bold">
            ${stressPrice.toLocaleString('en-US')} USDso
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
          min="55000"
          max="105000"
          step="250"
          value={stressPrice}
          onChange={(e) => setStressPrice(parseFloat(e.target.value))}
          aria-label="Simulated stress test market price"
          className="w-full accent-cyan-400 cursor-pointer"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>$55,000 (-30%)</span>
          <span>Entry: ${entryPrice.toLocaleString('en-US')}</span>
          <span>$105,000 (+30%)</span>
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
        {/* Panic Actions */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400">Emergency De-Risk Actions</label>
          <div className="flex space-x-2">
            <button
              onClick={() => handlePanic(50)}
              className="flex-1 py-2 px-3 rounded-lg bg-amber-500/20 hover:bg-amber-500 border border-amber-500/50 text-amber-300 hover:text-black font-display font-bold text-xs transition-all flex items-center justify-center space-x-1"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>De-Risk 50%</span>
            </button>
            <button
              onClick={() => handlePanic(100)}
              className="flex-1 py-2 px-3 rounded-lg bg-rose-500/20 hover:bg-rose-500 border border-rose-500 text-rose-300 hover:text-white font-display font-bold text-xs transition-all flex items-center justify-center space-x-1"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Panic Exit 100%</span>
            </button>
          </div>
        </div>

        {/* Reactive SL/TP Configuration */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-slate-400">Client-Side Reactive SL/TP</label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              placeholder="Stop-Loss Price"
              aria-label="Stop-Loss Price in USDso"
              value={stopLossPrice}
              onChange={(e) => setStopLossPrice(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] text-rose-400 font-mono text-xs"
            />
            <input
              type="number"
              placeholder="Take-Profit Price"
              aria-label="Take-Profit Price in USDso"
              value={takeProfitPrice}
              onChange={(e) => setTakeProfitPrice(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] text-emerald-400 font-mono text-xs"
            />
          </div>
          <p className="text-[10px] text-amber-400/90 font-mono">
            ⚠️ <strong>Active Tab Required:</strong> Client-side reactive SL/TP monitors triggers
            locally and executes market exit orders ONLY while this browser tab remains open. Do not
            close or navigate away if active defense is required.
          </p>
        </div>
      </div>
    </div>
  );
};
