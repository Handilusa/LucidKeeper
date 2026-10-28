import React from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Shield, ChevronDown, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { MarketInfo } from '@/lib/data/indexer';
import { formatDynamicPrice } from '@/lib/math/format';

interface MarketHeaderProps {
  markets: MarketInfo[];
  selectedMarket: MarketInfo;
  onSelectMarket: (market: MarketInfo) => void;
  markPrice: number;
  priceChange24h?: number | null;
  fundingRate8h?: number | null;
  indexPrice?: number | null;
  openInterestUsd?: number | null;
  onOpenMarginHub: () => void;
}

/** Format OI in USD with K/M/B suffix */
function formatOI(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(2)}B`;
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}K`;
  return `$${usd.toFixed(0)}`;
}

export const MarketHeader: React.FC<MarketHeaderProps> = ({
  markets,
  selectedMarket,
  onSelectMarket,
  markPrice,
  priceChange24h = null,
  fundingRate8h = null,
  indexPrice = null,
  openInterestUsd = null,
  onOpenMarginHub,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const change24hColor =
    priceChange24h == null
      ? 'text-slate-500'
      : priceChange24h >= 0
      ? 'text-emerald-400'
      : 'text-rose-400';

  const funding8hColor =
    fundingRate8h == null
      ? 'text-slate-500'
      : fundingRate8h > 0
      ? 'text-amber-400'
      : fundingRate8h < 0
      ? 'text-cyan-400'
      : 'text-slate-400';

  const Change24hIcon =
    priceChange24h == null
      ? Minus
      : priceChange24h > 0
      ? TrendingUp
      : priceChange24h < 0
      ? TrendingDown
      : Minus;

  return (
    <header className="border-b border-[#1a2536] bg-[#0d131d]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand & Market Selector */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-cyan-500 to-amber-500 p-[1px] glow-cyan">
              <div className="h-full w-full bg-[#070a0e] rounded-[7px] flex items-center justify-center font-bold text-cyan-400">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-lg tracking-wide text-white font-display">
                  LucidKeeper
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/50">
                  Tokyo Testnet
                </span>
              </div>
            </div>
          </div>

          <div className="h-6 w-[1px] bg-[#1a2536] hidden md:block" />

          {/* Market Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-label="Select perpetual market"
              aria-expanded={dropdownOpen}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] hover:border-cyan-500/50 transition-colors text-sm font-semibold text-white"
            >
              <span>{selectedMarket.baseSymbol}-PERP</span>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl bg-[#0d131d] border border-[#1a2536] shadow-2xl p-2 z-50 max-h-72 overflow-y-auto">
                <div className="text-[11px] font-mono text-slate-500 px-2 py-1 uppercase">
                  21 Perp Markets
                </div>
                {markets.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onSelectMarket(m);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                      m.id === selectedMarket.id
                        ? 'bg-cyan-500/10 text-cyan-400 font-bold'
                        : 'text-slate-300 hover:bg-[#121a28]'
                    }`}
                  >
                    <span>{m.baseSymbol}-PERP</span>
                    <span className="text-xs font-mono text-slate-500">{m.baseDecimals} dec</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Market Telemetry — 5 real on-chain / indexer metrics */}
        <div className="hidden lg:flex items-center space-x-5 text-xs font-mono">

          {/* 1. MARK PRICE — on-chain, 3s refresh */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Mark Price</div>
            <div className="text-white font-bold text-sm tabular-nums">
              {markPrice > 0 ? `$${formatDynamicPrice(markPrice)}` : '--'}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1a2536]" />

          {/* 2. INDEX PRICE (Oracle) — on-chain, 3s refresh */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Index (Oracle)</div>
            <div className="text-slate-300 font-semibold tabular-nums">
              {indexPrice != null ? `$${formatDynamicPrice(indexPrice)}` : '--'}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1a2536]" />

          {/* 3. 24H CHANGE — dreamDEX indexer 1h candles, 60s refresh */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">24H Change</div>
            <div className={`font-semibold flex items-center gap-0.5 ${change24hColor}`}>
              <Change24hIcon className="w-3 h-3" />
              {priceChange24h != null
                ? `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`
                : '--'}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1a2536]" />

          {/* 4. FUNDING RATE (8H) — on-chain getCurrentFundingRate, 5s refresh */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Funding 8H</div>
            <div className={`font-semibold tabular-nums ${funding8hColor}`}>
              {fundingRate8h != null
                ? `${fundingRate8h >= 0 ? '+' : ''}${(fundingRate8h * 100).toFixed(4)}%`
                : '--'}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1a2536]" />

          {/* 5. OPEN INTEREST (USD) — on-chain getOpenInterest × markPrice, 3s refresh */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Open Interest</div>
            <div className="text-violet-400 font-semibold tabular-nums">
              {openInterestUsd != null ? formatOI(openInterestUsd) : '--'}
            </div>
          </div>

          <div className="w-px h-6 bg-[#1a2536]" />

          {/* 6. NETWORK STATUS */}
          <div className="flex flex-col items-start">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider mb-0.5">Network</div>
            <div className="text-cyan-400 font-semibold flex items-center space-x-1">
              <Activity className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>Somnia (50383)</span>
            </div>
          </div>
        </div>

        {/* Actions & Connect Wallet */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenMarginHub}
            className="px-3 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] hover:border-cyan-400 text-xs font-mono text-cyan-400 hover:text-white transition-all shadow-sm"
          >
            Margin Hub ↗
          </button>

          <ConnectButton.Custom>
            {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
              const ready = mounted;
              const connected = ready && account && chain;

              return (
                <div
                  {...(!ready && {
                    'aria-hidden': true,
                    style: { opacity: 0, pointerEvents: 'none', userSelect: 'none' },
                  })}
                >
                  {(() => {
                    if (!connected) {
                      return (
                        <button
                          onClick={openConnectModal}
                          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-amber-500 hover:from-cyan-500 hover:to-amber-400 text-black font-extrabold text-xs transition-all shadow-md font-display"
                        >
                          Connect Wallet
                        </button>
                      );
                    }

                    if (chain.unsupported) {
                      return (
                        <button
                          onClick={openChainModal}
                          className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500 text-rose-400 text-xs font-mono"
                        >
                          Wrong Network (Switch to Tokyo)
                        </button>
                      );
                    }

                    return (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={openChainModal}
                          className="hidden sm:flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] text-xs font-mono text-slate-300"
                        >
                          <span>{chain.name}</span>
                        </button>

                        <button
                          onClick={openAccountModal}
                          className="px-3 py-1.5 rounded-lg bg-[#070a0e] border border-[#1a2536] hover:border-cyan-500 text-xs font-mono text-slate-200"
                        >
                          {account.displayName}
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            }}
          </ConnectButton.Custom>
        </div>
      </div>
    </header>
  );
};
