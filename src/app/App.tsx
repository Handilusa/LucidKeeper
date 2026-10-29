import React, { useState, useEffect, useRef } from 'react';
import { useAccount, useReadContract, useBalance, useSwitchChain, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { formatUnits } from 'viem';
import { AppHeader } from '@/features/terminal/AppHeader';
import { AccountSummary } from '@/features/terminal/AccountSummary';
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
import { readDisplay } from '@/lib/data/readDisplay';
import { normalizedFunding8h } from '@/lib/math/preview';
import { computeLiquidationPrice } from '@/lib/math/liquidation';
import { GuardianOverview } from '@/features/sentinel/GuardianOverview';

export const App: React.FC = () => {
  const { address, isConnected, chainId } = useAccount();
  const { switchChain } = useSwitchChain();
  const publicClient = usePublicClient({ chainId: 50383 });
  const [selectedMarket, setSelectedMarket] = useState<MarketInfo>(ALL_VERIFIED_PERP_MARKETS[0]);
  const [marginHubOpen, setMarginHubOpen] = useState(false);
  const [cardPosition, setCardPosition] = useState<PositionItem | null>(null);
  const [mobileView, setMobileView] = useState<'chart' | 'trade' | 'activity'>('chart');
  const riskRef = useRef<HTMLDetailsElement>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const { data: markets = ALL_VERIFIED_PERP_MARKETS } = useQuery({
    queryKey: ['perpMarkets'],
    queryFn: fetchPerpMarkets,
    staleTime: 60000,
  });
  const currentAccount = (address || '0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA') as `0x${string}`;

  const gasQuery = useBalance({
    address: currentAccount,
    chainId: 50383,
    query: { refetchInterval: 15000 },
  });
  const walletQuery = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [currentAccount],
    chainId: 50383,
    query: { refetchInterval: 15000 },
  });
  const stateQuery = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountState',
    args: [currentAccount],
    chainId: 50383,
    query: { refetchInterval: 3000 },
  });
  const healthQuery = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountHealth',
    args: [currentAccount],
    chainId: 50383,
    query: { refetchInterval: 3000 },
  });
  const markQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'tryGetMarkPrice',
    chainId: 50383,
    query: { refetchInterval: 3000 },
  });
  const indexQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getIndexPrice',
    chainId: 50383,
    query: { refetchInterval: 3000 },
  });
  const fundingQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getCurrentFundingRate',
    chainId: 50383,
    query: { refetchInterval: 5000 },
  });
  const fundingParamsQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getFundingParameters',
    chainId: 50383,
    query: { refetchInterval: 15000 },
  });
  const oiQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getOpenInterest',
    chainId: 50383,
    query: { refetchInterval: 3000 },
  });
  const baseQuery = useReadContract({
    address: selectedMarket.poolAddress as `0x${string}`,
    abi: perpPoolAbi,
    functionName: 'getOneBase',
    chainId: 50383,
    query: { staleTime: 60000 },
  });
  const staleMark = markQuery.isError || now - markQuery.dataUpdatedAt > 30000;
  const markPrice =
    !staleMark && markQuery.data?.[0]
      ? Number(formatUnits(markQuery.data[1], selectedMarket.quoteDecimals))
      : 0;
  const priceStatus = markQuery.isPending
    ? 'Loading mark…'
    : staleMark
      ? 'Mark unavailable / stale'
      : markPrice > 0
        ? 'On-chain mark · 3s poll'
        : 'Mark unavailable';
  const indexPrice =
    !indexQuery.isError &&
    now - indexQuery.dataUpdatedAt < 30000 &&
    indexQuery.data &&
    indexQuery.data[0] > 0n
      ? Number(formatUnits(indexQuery.data[0], selectedMarket.quoteDecimals))
      : null;
  const fundingRate8h =
    !fundingQuery.isError &&
    now - fundingQuery.dataUpdatedAt < 30000 &&
    fundingQuery.data !== undefined &&
    !fundingParamsQuery.isError && now - fundingParamsQuery.dataUpdatedAt < 45000 &&
    fundingParamsQuery.data
      ? normalizedFunding8h(fundingQuery.data, fundingParamsQuery.data.fundingCalculationWindowSec)
      : null;
  const openInterestUsd =
    !oiQuery.isError &&
    now - oiQuery.dataUpdatedAt < 30000 &&
    oiQuery.data !== undefined &&
    baseQuery.data &&
    markPrice > 0
      ? (Number(oiQuery.data) / Number(baseQuery.data)) * markPrice
      : null;
  const changeQuery = useQuery({
    queryKey: ['priceChange24h', selectedMarket.poolAddress],
    queryFn: () => fetchMarket24hChange(selectedMarket.poolAddress),
    refetchInterval: 60000,
    staleTime: 30000,
  });
  const accountState = stateQuery.data;

  const positionQuery = useQuery({
    queryKey: [
      'userPositions',
      50383,
      currentAccount,
      accountState?.activePerpPools,
      selectedMarket.poolAddress,
    ],
    enabled: !!publicClient && !!accountState,
    refetchInterval: 3000,
    queryFn: async () => {
      if (!publicClient || !accountState) throw new Error('Account state unavailable');
      // A liquidation line must describe a single block, including portfolio health.
      const blockNumber = await publicClient.getBlockNumber();
      const [health, pinnedState] = await Promise.all([publicClient.readContract({
        address: CONTRACT_ADDRESSES.MARGIN_BANK, abi: marginBankAbi,
        functionName: 'getAccountHealth', args: [currentAccount], blockNumber,
      }), publicClient.readContract({
        address: CONTRACT_ADDRESSES.MARGIN_BANK, abi: marginBankAbi,
        functionName: 'getAccountState', args: [currentAccount], blockNumber,
      })]);
      const pools = Array.from(
        new Set([
          ...pinnedState.activePerpPools.map((p) => p.toLowerCase()),
          selectedMarket.poolAddress.toLowerCase(),
        ])
      );
      const items = await Promise.all(
        pools.map(async (poolAddress): Promise<PositionItem | null> => {
          const market = ALL_VERIFIED_PERP_MARKETS.find(
            (m) => m.poolAddress.toLowerCase() === poolAddress
          );
          if (!market) throw new Error('An active pool is not in the verified market list');
          const [pos, mark, params] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.MARGIN_BANK,
              abi: marginBankAbi,
              functionName: 'getPosition',
              args: [currentAccount, market.poolAddress as `0x${string}`],
              blockNumber,
            }),
            publicClient.readContract({
              address: market.poolAddress as `0x${string}`,
              abi: perpPoolAbi,
              functionName: 'tryGetMarkPrice',
              blockNumber,
            }),
            publicClient.readContract({
              address: market.poolAddress as `0x${string}`, abi: perpPoolAbi,
              functionName: 'getPerpPoolParameters', blockNumber,
            }),
          ]);
          if (pos.size === 0n) return null;
          const isLong = pos.size > 0n;
          const size = Number(formatUnits(isLong ? pos.size : -pos.size, market.baseDecimals));
          const entryPrice = Number(formatUnits(pos.avgEntryPrice, market.quoteDecimals));
          const poolMark = mark[0] ? Number(formatUnits(mark[1], market.quoteDecimals)) : 0;
          const liquidation = mark[0] ? computeLiquidationPrice({
            equity: health[0], mmReq: health[2], size: pos.size, markPrice: mark[1],
            maintenanceMarginBps: BigInt(params.maintenanceMarginBps),
            oneBase: 10n ** BigInt(market.baseDecimals),
          }) : null;
          let leverage = 5;
          try {
            const saved = Number(localStorage.getItem(`lucidkeeper_leverage_${poolAddress}`));
            if (Number.isFinite(saved) && saved >= 1 && saved <= 100) leverage = saved;
          } catch {
            /* Storage is optional. */
          }
          const matchingTrade = getTradeHistory(currentAccount).find(
            (h) => h.type === 'order' && h.marketSymbol === market.baseSymbol
          );
          return {
            id: `live-${market.baseSymbol}-${currentAccount}`,
            marketSymbol: market.baseSymbol,
            poolAddress: market.poolAddress,
            isLong,
            size,
            entryPrice,
            markPrice: poolMark,
            liquidationPrice: liquidation === null ? null : Number(formatUnits(liquidation, market.quoteDecimals)),
            readBlock: blockNumber.toString(),
            maintenanceMarginBps: params.maintenanceMarginBps,
            margin: (size * entryPrice) / leverage,
            leverage,
            openTxHash: matchingTrade?.hash || '',
            baseDecimals: market.baseDecimals,
            quoteDecimals: market.quoteDecimals,
          };
        })
      );
      return { health, blockNumber, items: items
        .filter((item): item is PositionItem => item !== null)
        .sort((a, b) => a.marketSymbol.localeCompare(b.marketSymbol)) };
    },
  });

  const marginReady =
    !!healthQuery.data && !healthQuery.isError && now - healthQuery.dataUpdatedAt < 30000;
  const unlockedMargin = accountState
    ? Number(formatUnits(accountState.unlockedCollateralBalance, 18))
    : 0;
  const freeCollateral = healthQuery.data
    ? Math.max(0, Number(formatUnits(healthQuery.data![0] - healthQuery.data![1], 18)))
    : 0;
  const availableRead = readDisplay(healthQuery.data ? freeCollateral : null, healthQuery.dataUpdatedAt, healthQuery.isError, now, 30000);
   const positions = positionQuery.data?.items || [];
  const positionsError =
    stateQuery.isError ||
    positionQuery.isError ||
    (!stateQuery.isPending && now - stateQuery.dataUpdatedAt > 30000) ||
    (!positionQuery.isPending && now - positionQuery.dataUpdatedAt > 30000);
  const canManage = isConnected && chainId === 50383 && !positionsError && !!positionQuery.data;
  const refreshAccount = React.useCallback(() => {
    void stateQuery.refetch();
    void healthQuery.refetch();
    void positionQuery.refetch();
    void walletQuery.refetch();
    void gasQuery.refetch();
  }, [stateQuery.refetch, healthQuery.refetch, positionQuery.refetch, walletQuery.refetch, gasQuery.refetch]);
  const navigate = (view: 'chart' | 'activity' | 'risk') => {
    if (view === 'risk') {
      if (riskRef.current) riskRef.current.open = true;
    } else setMobileView(view);
  };

  return (
    <>
      <a className="skip-link" href="#terminal">
        Skip to trading workspace
      </a>
      <AppHeader onNavigate={navigate} />
      {isConnected && chainId !== 50383 && (
        <div className="network-alert" role="alert">
          <span>Wrong network. Trading requires Somnia Tokyo testnet (50383).</span>
          <button className="button" onClick={() => switchChain({ chainId: 50383 })}>
            Switch to Tokyo
          </button>
        </div>
      )}
      <main className="terminal" id="terminal" tabIndex={-1}>
        <MarketHeader
          markets={markets}
          selectedMarket={selectedMarket}
          onSelectMarket={setSelectedMarket}
          markPrice={markPrice}
          priceChange24h={
            !changeQuery.isError && now - changeQuery.dataUpdatedAt < 90000
              ? changeQuery.data
              : null
          }
          fundingRate8h={fundingRate8h}
          indexPrice={indexPrice}
          openInterestUsd={openInterestUsd}
          priceStatus={priceStatus}
          markUpdatedAt={markQuery.dataUpdatedAt}
          markStale={staleMark || markPrice <= 0}
          fundingWindow={fundingParamsQuery.data ? Number(fundingParamsQuery.data.fundingCalculationWindowSec) : null}
        />
        <nav className="mobile-nav" aria-label="Trading workspace">
          {(['chart', 'trade', 'activity'] as const).map((view) => (
            <button
              key={view}
              aria-pressed={mobileView === view}
              onClick={() => setMobileView(view)}
            >
              {view[0].toUpperCase() + view.slice(1)}
            </button>
          ))}
        </nav>
        <div className="workspace" data-mobile-view={mobileView}>
          <div className="guardian-area">
            <GuardianOverview
              equity={positionQuery.data ? Number(formatUnits(positionQuery.data.health[0], 18)) : null}
              maintenance={positionQuery.data ? Number(formatUnits(positionQuery.data.health[2], 18)) : null}
              loading={!positionsError && (stateQuery.isPending || positionQuery.isPending)}
              stale={positionsError}
              updatedAt={positionQuery.dataUpdatedAt}
              connected={isConnected}
              onOpen={() => { navigate('risk'); riskRef.current?.scrollIntoView({ block: 'start' }); }}
              onRetry={refreshAccount}
            />
          </div>
          <section className="chart-area" aria-label="Price chart">
            <Chart
              key={selectedMarket.poolAddress}
              poolAddress={selectedMarket.poolAddress}
              symbol={selectedMarket.baseSymbol}
              currentMarkPrice={markPrice}
              tickSize={selectedMarket.tickSize}
              position={positionsError ? undefined : positions.find(p => p.poolAddress.toLowerCase() === selectedMarket.poolAddress.toLowerCase())}
            />
          </section>
          <section className="trade-area" aria-label="Order entry">
            <TradingBox
              market={selectedMarket}
              markPrice={markPrice}
              availableMargin={freeCollateral}
              availableRead={availableRead}
              marginReady={marginReady && !positionsError && !!positionQuery.data}
              totalUnlockedMargin={unlockedMargin}
              currentPosition={positions.find(
                (p) => p.poolAddress.toLowerCase() === selectedMarket.poolAddress.toLowerCase()
              )}
              onOrderSuccess={refreshAccount}
              onOpenMarginHub={() => setMarginHubOpen(true)}
            />
          </section>
          <section className="activity-area" id="activity" aria-label="Portfolio activity">
            <AccountSummary
              account={currentAccount}
              connected={isConnected}
              wallet={readDisplay(walletQuery.data !== undefined ? Number(formatUnits(walletQuery.data, 18)) : null, walletQuery.dataUpdatedAt, walletQuery.isError, now, 45000)}
              deposited={readDisplay(accountState ? unlockedMargin : null, stateQuery.dataUpdatedAt, stateQuery.isError, now, 30000)}
              available={availableRead}
              gas={readDisplay(gasQuery.data ? Number(gasQuery.data.formatted) : null, gasQuery.dataUpdatedAt, gasQuery.isError, now, 45000)}
              onManage={() => setMarginHubOpen(true)}
            />
            <PositionsTable
              key={currentAccount}
              positions={positions}
              markPrice={markPrice}
              account={currentAccount}
              canManage={canManage}
              loading={stateQuery.isPending || positionQuery.isPending}
              error={positionsError}
              onOpenCardModal={setCardPosition}
              onPositionClosed={refreshAccount}
              onSelectMarket={(symbol) => {
                const market = markets.find((m) => m.baseSymbol === symbol);
                if (market) {
                  setSelectedMarket(market);
                  setMobileView('chart');
                }
              }}
            />
          </section>
        </div>
        <details className="risk-disclosure" id="risk" ref={riskRef}>
          <summary>
            <strong>Risk Guardian</strong>
            <span className="muted">Browser-local triggers · wallet approval required</span>
          </summary>
          <div className="risk-body">
            <p className="form-note mb-4">
              Selected-market stress estimates, not portfolio liquidation forecasts. Keep this
              browser tab active for armed triggers.
            </p>
            <RiskGuardian
              key={`${currentAccount}-${chainId ?? 'readonly'}`}
              positions={positionsError ? [] : positions}
              selectedSymbol={selectedMarket.baseSymbol}
              marginBalance={unlockedMargin}
              canExecute={canManage && marginReady}
              onPanicExit={refreshAccount}
            />
          </div>
        </details>
      </main>
      <footer className="app-footer">
        <span>LucidKeeper · dreamDEX Perps Builder Bounty · Somnia Tokyo testnet 50383</span>
        <nav aria-label="Resources">
          <a href="https://app.testnet.dreamdex.io" target="_blank" rel="noreferrer">
            dreamDEX ↗
          </a>
          <a href="https://explorer.testnet.somnia.network/tokyo" target="_blank" rel="noreferrer">
            Explorer ↗
          </a>
          <a href="https://github.com/Handilusa/LucidKeeper" target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
        </nav>
      </footer>
      <MarginHubModal
        isOpen={marginHubOpen}
        onClose={() => setMarginHubOpen(false)}
        unlockedMargin={accountState && !stateQuery.isError ? unlockedMargin : null}
      />
      <TradeCardModal
        isOpen={!!cardPosition}
        onClose={() => setCardPosition(null)}
        position={cardPosition}
      />
    </>
  );
};
