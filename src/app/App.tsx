import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useBalance, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { MarketHeader } from '@/features/terminal/MarketHeader';
import { Chart } from '@/features/terminal/Chart';
import { TradingBox } from '@/features/trade/TradingBox';
import { PositionsTable, type PositionItem } from '@/features/portfolio/PositionsTable';
import { RiskGuardian } from '@/features/sentinel/RiskGuardian';
import { MarginHubModal } from '@/features/margin/MarginHubModal';
import { TradeCardModal } from '@/features/share/TradeCardModal';
import { fetchPerpMarkets, fetchMarket24hChange, type MarketInfo } from '@/lib/data/indexer';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi, perpPoolAbi } from '@/chain/abis';
import { getTradeHistory } from '@/lib/data/tradeHistory';
import { formatDynamicPrice } from '@/lib/math/format';

export const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();

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

  const [markPrice, setMarkPrice] = useState<number>(0);
  const [marginHubOpen, setMarginHubOpen] = useState<boolean>(false);
  const [cardModalOpen, setCardModalOpen] = useState<boolean>(false);
  const [cardPosition, setCardPosition] = useState<PositionItem | null>(null);
  const [priceChange24h, setPriceChange24h] = useState<number | null>(null);

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

  const currentAccount = (address || '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA') as `0x${string}`;

  // On-Chain Reads for connected account
  const { data: sttBalance } = useBalance({
    address: currentAccount,
  });

  const { data: usdsoBalanceRaw } = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [currentAccount],
  });

  const publicClient = usePublicClient();

  const { data: accountState, refetch: refetchAccountState } = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountState',
    args: [currentAccount],
    query: {
      refetchInterval: 3000,
    },
  });

  // Read Live Cross-Margin Account Health (Equity & IM requirements across all active positions)
  const { data: accountHealth, refetch: refetchAccountHealth } = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountHealth',
    args: [currentAccount],
    query: {
      refetchInterval: 3000,
    },
  });

  // Read Live On-Chain Mark Price directly from active PerpPool
  const { data: markPriceRaw } = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'tryGetMarkPrice',
    query: {
      refetchInterval: 3000,
    },
  });

  // Read Live On-Chain Index (Oracle) Price
  const { data: indexPriceRaw } = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getIndexPrice',
    query: {
      refetchInterval: 3000,
    },
  });

  // Read Live On-Chain Funding Rate (8h normalized via fundingWindowSec = 28800)
  const { data: fundingRateRaw } = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getCurrentFundingRate',
    query: {
      refetchInterval: 5000,
    },
  });

  // Read Live On-Chain Open Interest (single counter — long side = short side in CLOB)
  const { data: openInterestRaw } = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getOpenInterest',
    query: {
      refetchInterval: 3000,
    },
  });

  // Read oneBase for the selected pool to convert raw OI atoms → human units
  const { data: oneBaseRaw } = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getOneBase',
    query: {
      refetchInterval: 60000,
    },
  });

  // Derive computed header telemetry from on-chain reads
  const indexPrice: number | null =
    indexPriceRaw && indexPriceRaw[0] > 0n
      ? parseFloat(formatUnits(indexPriceRaw[0], selectedMarket.quoteDecimals))
      : null;

  // Funding rate per 8H as plain fraction (0.001 = 0.1%). SDK formula:
  // fundingRate8h(rate, windowSec) where windowSec=28800 → rate/1e18
  const fundingRate8h: number | null =
    fundingRateRaw !== undefined && fundingRateRaw !== null
      ? Number(fundingRateRaw) / 1e18
      : null;

  // Open Interest in USD notional: (oi_atoms / oneBase) * markPrice
  const openInterestUsd: number | null =
    openInterestRaw !== undefined && oneBaseRaw !== undefined && oneBaseRaw > 0n && markPrice > 0
      ? (Number(openInterestRaw) / Number(oneBaseRaw)) * markPrice
      : null;

  // Update markPrice dynamically when pool or markPrice changes
  useEffect(() => {
    if (markPriceRaw && markPriceRaw[0]) {
      const price = parseFloat(formatUnits(markPriceRaw[1], selectedMarket.quoteDecimals));
      if (price > 0) {
        setMarkPrice(price);
      }
    }
  }, [markPriceRaw, selectedMarket]);

  // Reset 24h change display while new data loads on market switch
  useEffect(() => {
    setPriceChange24h(null);
  }, [selectedMarket.poolAddress]);

  // Fetch real 24h price change from dreamDEX indexer candles (1h buckets) whenever market changes
  useQuery({
    queryKey: ['priceChange24h', selectedMarket.poolAddress],
    queryFn: async () => {
      const change = await fetchMarket24hChange(selectedMarket.poolAddress);
      setPriceChange24h(change);
      return change;
    },
    refetchInterval: 60000, // refresh every minute
    staleTime: 30000,
  });

  // Read ALL Live On-Chain Positions across all active markets from MarginBank
  const { data: onchainPositions, refetch: refetchPositions } = useQuery({
    queryKey: [
      'userPositions',
      currentAccount,
      accountState?.activePerpPools,
      selectedMarket.poolAddress,
    ],
    queryFn: async () => {
      if (!publicClient) return [];
      const poolAddresses = Array.from(
        new Set([
          ...(accountState?.activePerpPools || []).map((p) => p.toLowerCase()),
          selectedMarket.poolAddress.toLowerCase(),
        ])
      );

      const items: PositionItem[] = [];
      await Promise.all(
        poolAddresses.map(async (poolAddress) => {
          try {
            const market = ALL_VERIFIED_PERP_MARKETS.find(
              (m) => m.poolAddress.toLowerCase() === poolAddress
            );
            if (!market) return;

            const [pos, mark] = await Promise.all([
              publicClient.readContract({
                address: CONTRACT_ADDRESSES.MARGIN_BANK,
                abi: marginBankAbi,
                functionName: 'getPosition',
                args: [currentAccount, market.poolAddress as `0x${string}`],
              }),
              publicClient.readContract({
                address: market.poolAddress as `0x${string}`,
                abi: perpPoolAbi,
                functionName: 'tryGetMarkPrice',
              }),
            ]);

            if (pos && pos.size !== 0n) {
              const isLong = pos.size > 0n;
              const absSizeAtoms = isLong ? pos.size : -pos.size;
              const sizeFormatted = parseFloat(formatUnits(absSizeAtoms, market.baseDecimals));
              const entryPriceFormatted = parseFloat(
                formatUnits(pos.avgEntryPrice, market.quoteDecimals)
              );

              let poolMark = entryPriceFormatted;
              if (mark && mark[0]) {
                const markFormatted = parseFloat(formatUnits(mark[1], market.quoteDecimals));
                if (markFormatted > 0) poolMark = markFormatted;
              }

              const notional = sizeFormatted * (entryPriceFormatted > 0 ? entryPriceFormatted : poolMark);
              let posLeverage = 5;
              if (typeof window !== 'undefined') {
                const savedLev = localStorage.getItem(`lucidkeeper_leverage_${market.poolAddress.toLowerCase()}`);
                if (savedLev && !isNaN(parseInt(savedLev, 10))) {
                  posLeverage = parseInt(savedLev, 10);
                }
              }
              const calculatedMargin = posLeverage > 0 ? notional / posLeverage : notional;

              const userHistory = getTradeHistory(currentAccount);
              const matchingTrade = userHistory.find(
                (h) => h.type === 'order' && h.marketSymbol === market.baseSymbol
              );

              items.push({
                id: `live-${market.baseSymbol}-${currentAccount.slice(0, 6)}`,
                marketSymbol: market.baseSymbol,
                poolAddress: market.poolAddress,
                isLong,
                size: sizeFormatted,
                entryPrice: entryPriceFormatted > 0 ? entryPriceFormatted : poolMark,
                markPrice: poolMark,
                margin: calculatedMargin,
                leverage: posLeverage,
                openTxHash: matchingTrade ? matchingTrade.hash : '',
                baseDecimals: market.baseDecimals,
                quoteDecimals: market.quoteDecimals,
              });
            }
          } catch (err) {
            console.warn(`Error reading position for pool ${poolAddress}:`, err);
          }
        })
      );

      items.sort((a, b) => a.marketSymbol.localeCompare(b.marketSymbol));
      return items;
    },
    refetchInterval: 3000,
    enabled: !!publicClient,
  });

  const positions = onchainPositions || [];

  const unlockedMargin = accountState
    ? parseFloat(formatUnits(accountState.unlockedCollateralBalance, 18))
    : 0;

  const totalEquity = accountHealth
    ? parseFloat(formatUnits(accountHealth[0], 18))
    : unlockedMargin;

  const totalImReq = accountHealth
    ? parseFloat(formatUnits(accountHealth[1], 18))
    : 0;

  // Free actionable collateral that can open new positions without reverting
  const freeCollateral = accountHealth
    ? Math.max(0, totalEquity - totalImReq)
    : unlockedMargin;

  const walletUsdso = usdsoBalanceRaw ? parseFloat(formatUnits(usdsoBalanceRaw, 18)) : 0;

  const handleOpenCard = (pos: PositionItem) => {
    setCardPosition(pos);
    setCardModalOpen(true);
  };

  const handlePositionClosed = React.useCallback(() => {
    refetchAccountState();
    refetchAccountHealth();
    refetchPositions();
  }, [refetchAccountState, refetchAccountHealth, refetchPositions]);

  const activeMarketPosition = positions.find(
    (p) => p.poolAddress.toLowerCase() === selectedMarket.poolAddress.toLowerCase()
  );

  return (
    <div className="min-h-screen flex flex-col justify-between selection:bg-cyan-500 selection:text-black">
      {/* Network Alert Banner */}
      {isConnected && chainId !== 50383 && (
        <div className="bg-rose-500/20 border-b border-rose-500 text-rose-200 px-4 py-2.5 flex items-center justify-between text-xs font-mono z-50">
          <div className="flex items-center space-x-2">
            <span className="text-rose-400 font-bold">⚠️ Red Incorrecta:</span>
            <span>Tu wallet está conectada a la red con Chain ID {chainId}. Debes estar en Somnia Tokyo (Chain ID 50383).</span>
          </div>
          <button
            onClick={() => switchChain({ chainId: 50383 })}
            className="px-3 py-1 bg-rose-500 hover:bg-rose-600 text-white font-bold rounded text-xs transition-colors cursor-pointer"
          >
            Cambiar a Somnia Tokyo (50383)
          </button>
        </div>
      )}

      {/* Header */}
      <MarketHeader
        markets={markets}
        selectedMarket={selectedMarket}
        onSelectMarket={setSelectedMarket}
        markPrice={markPrice}
        priceChange24h={priceChange24h}
        fundingRate8h={fundingRate8h}
        indexPrice={indexPrice}
        openInterestUsd={openInterestUsd}
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
                {sttBalance ? parseFloat(sttBalance.formatted).toFixed(4) : '--'}
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
                {usdsoBalanceRaw !== undefined ? walletUsdso.toFixed(2) : '--'}
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
                {accountState ? unlockedMargin.toFixed(2) : '--'}
              </span>
              <span className="text-xs text-slate-400">USDso</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Bank: 0x4787...1394</span>
              {totalImReq > 0 ? (
                <span
                  className="text-amber-400 font-semibold"
                  title={`Margen inicial usado por posiciones activas: $${totalImReq.toFixed(2)} USDso`}
                >
                  Free: ${freeCollateral.toFixed(2)}
                </span>
              ) : (
                <span className="text-cyan-400">Active</span>
              )}
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
                {markPrice > 0 ? `$${formatDynamicPrice(markPrice)}` : '--'}
              </span>
              <span className="text-xs text-slate-400">USDso</span>
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex items-center justify-between">
              <span>Tick: {selectedMarket.tickSize || '--'} USDso</span>
              <span className="text-slate-400">21 Verified Pools</span>
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
              positions={positions}
              selectedSymbol={selectedMarket.baseSymbol}
              marginBalance={unlockedMargin}
              onPanicExit={() => {
                refetchAccountState();
                refetchAccountHealth();
                refetchPositions();
              }}
            />
          </div>

          {/* Trading Box (1 Column) */}
          <div className="space-y-6">
            <TradingBox
              market={selectedMarket}
              markPrice={markPrice}
              availableMargin={freeCollateral}
              totalUnlockedMargin={unlockedMargin}
              currentPosition={activeMarketPosition}
              onOrderSuccess={() => {
                refetchAccountState();
                refetchAccountHealth();
                refetchPositions();
              }}
            />
          </div>
        </div>

        {/* PORTFOLIO & ON-CHAIN POSITIONS TABLE */}
        <PositionsTable
          positions={positions}
          markPrice={markPrice}
          account={currentAccount}
          onOpenCardModal={handleOpenCard}
          onPositionClosed={handlePositionClosed}
          onSelectMarket={(symbol) => {
            const match = markets.find((m) => m.baseSymbol.toUpperCase() === symbol.toUpperCase());
            if (match) {
              setSelectedMarket(match);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
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
