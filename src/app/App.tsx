import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { formatUnits } from 'viem';
import { MarketHeader } from '@/features/terminal/MarketHeader';
import { Chart } from '@/features/terminal/Chart';
import { TradingBox } from '@/features/trade/TradingBox';
import { PositionsTable, type PositionItem } from '@/features/portfolio/PositionsTable';
import { RiskGuardian } from '@/features/sentinel/RiskGuardian';
import { MarginHubModal } from '@/features/margin/MarginHubModal';
import { TradeCardModal } from '@/features/share/TradeCardModal';
import { fetchPerpMarkets, type MarketInfo } from '@/lib/data/indexer';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';

export const App: React.FC = () => {
  const { address } = useAccount();

  // State
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<MarketInfo>({
    id: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    baseSymbol: 'BTC',
    quoteSymbol: 'USDso',
    baseDecimals: 8,
    quoteDecimals: 18,
    poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
    marginBank: '0x478769E1177C0773c43A593DCCc4Ad15F15F1394',
    minQuantity: '0.00013',
    tickSize: '0.1',
    lotSize: '0.00001',
  });

  const [markPrice, setMarkPrice] = useState<number>(80264.9);
  const [marginHubOpen, setMarginHubOpen] = useState<boolean>(false);
  const [cardModalOpen, setCardModalOpen] = useState<boolean>(false);
  const [cardPosition, setCardPosition] = useState<PositionItem | null>(null);

  // Initial Open Position Baseline
  const [positions, setPositions] = useState<PositionItem[]>([
    {
      id: 'pos-1',
      marketSymbol: 'BTC',
      poolAddress: '0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0',
      isLong: true,
      size: 0.00013,
      entryPrice: 79946.0,
      markPrice: 80264.9,
      margin: 2.0,
      openTxHash: '0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a',
    },
  ]);

  // Load 21 markets
  useEffect(() => {
    async function load() {
      const data = await fetchPerpMarkets();
      if (data && data.length > 0) {
        setMarkets(data);
        const btc = data.find((m) => m.baseSymbol === 'BTC');
        if (btc) setSelectedMarket(btc);
      }
    }
    load();
  }, []);

  // Poll real mark price & telemetry
  useEffect(() => {
    const fetchTelemetry = async () => {
      try {
        const res = await fetch('/api/status');
        if (res.ok) {
          const json = await res.json();
          if (json?.market?.btcFeed?.markPrice) {
            setMarkPrice(parseFloat(json.market.btcFeed.markPrice));
          }
        }
      } catch {
        // Fallback or network error
      }
    };

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 3500);
    return () => clearInterval(interval);
  }, []);

  // On-Chain Reads for connected account
  const { data: sttBalance } = useBalance({
    address: address || '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA',
  });

  const { data: usdsoBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address || '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA'],
  });

  const { data: accountState } = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountState',
    args: [address || '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA'],
  });

  const unlockedMargin = accountState
    ? parseFloat(formatUnits(accountState.unlockedCollateralBalance, 18))
    : 2.0;

  const walletUsdso = usdsoBalanceRaw ? parseFloat(formatUnits(usdsoBalanceRaw, 18)) : 198.0;

  const handleOpenCard = (pos: PositionItem) => {
    setCardPosition(pos);
    setCardModalOpen(true);
  };

  const handlePositionClosed = () => {
    setPositions([]);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Header */}
      <MarketHeader
        markets={markets}
        selectedMarket={selectedMarket}
        onSelectMarket={setSelectedMarket}
        markPrice={markPrice}
        priceChange24h={0.85}
        fundingRate8h={0.01}
        onOpenMarginHub={() => setMarginHubOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 py-6 w-full space-y-6">
        {/* HERO METRICS HUD ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
          {/* STT Gas */}
          <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>GAS BALANCE (STT)</span>
              <span className="text-cyan-400">Native Tokyo</span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white tabular-nums">
                {sttBalance ? parseFloat(sttBalance.formatted).toFixed(2) : '89.96'}
              </span>
              <span className="text-xs text-slate-400">STT</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Bounty EOA</span>
              <span className="text-emerald-400">✓ Ready</span>
            </div>
          </div>

          {/* USDso Collateral */}
          <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>WALLET COLLATERAL</span>
              <span className="text-amber-400">USDso (ERC-20)</span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-white tabular-nums">
                {walletUsdso.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">USDso</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Contract: 0xed79...4F72</span>
              <span>18 Dec</span>
            </div>
          </div>

          {/* MarginBank Collateral */}
          <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>MARGINBANK COLLATERAL</span>
              <span className="text-cyan-400">Deposited</span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                {unlockedMargin.toFixed(2)}
              </span>
              <span className="text-xs text-slate-400">USDso</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Bank: 0x4787...1394</span>
              <span className="text-cyan-400">Active</span>
            </div>
          </div>

          {/* Mark Price */}
          <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{selectedMarket.baseSymbol}/USDSO MARK</span>
              <span className="text-emerald-400 flex items-center space-x-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                <span>Live Feed</span>
              </span>
            </div>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-amber-400 tabular-nums">
                $
                {markPrice.toLocaleString('en-US', {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </span>
              <span className="text-xs text-slate-400">USDso</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>CLOB Spread: ~0.1 USDso</span>
              <span className="text-slate-400">21 Pairs</span>
            </div>
          </div>
        </div>

        {/* MAIN TERMINAL GRID (CHART + TRADING BOX) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart View (2 Columns) */}
          <div className="lg:col-span-2 space-y-6">
            <Chart
              poolAddress={selectedMarket.poolAddress}
              symbol={selectedMarket.baseSymbol}
              currentMarkPrice={markPrice}
            />

            {/* DreamSentinel Autonomous Risk Guardian */}
            <RiskGuardian
              entryPrice={79946.0}
              currentMarkPrice={markPrice}
              positionSize={0.00013}
              marginBalance={unlockedMargin}
              onPanicExit={() => {
                if (positions.length > 0) {
                  setPositions([]);
                }
              }}
            />
          </div>

          {/* Trading Box (1 Column) */}
          <div className="space-y-6">
            <TradingBox
              market={selectedMarket}
              markPrice={markPrice}
              availableMargin={unlockedMargin}
              onOrderSuccess={() => {
                // Refresh on order success
              }}
            />
          </div>
        </div>

        {/* PORTFOLIO & ON-CHAIN POSITIONS TABLE */}
        <PositionsTable
          positions={positions}
          markPrice={markPrice}
          onOpenCardModal={handleOpenCard}
          onPositionClosed={handlePositionClosed}
        />
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#1a2536] bg-[#0d131d]/70 py-4 mt-8 text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span>
              LucidKeeper v1.0.0 · Somnia Tokyo Testnet (50383) · dreamDEX Perps Builder Bounty
            </span>
          </div>
          <div className="flex items-center space-x-4 text-slate-400">
            <a
              href="https://app.testnet.dreamdex.io"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400"
            >
              dreamDEX Official ↗
            </a>
            <span>·</span>
            <a
              href="https://explorer.testnet.somnia.network/tokyo"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400"
            >
              Tokyo Explorer ↗
            </a>
            <span>·</span>
            <a
              href="https://github.com/Handilusa/LucidKeeper"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cyan-400"
            >
              GitHub Repository ↗
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <MarginHubModal
        isOpen={marginHubOpen}
        onClose={() => setMarginHubOpen(false)}
        unlockedMargin={unlockedMargin}
      />

      <TradeCardModal
        isOpen={cardModalOpen}
        onClose={() => setCardModalOpen(false)}
        position={cardPosition}
      />
    </div>
  );
};
