import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';
import type { MarketInfo } from '@/lib/data/indexer';
import { formatDynamicPrice } from '@/lib/math/format';
import { HelpTip } from '@/components/HelpTip';
import { TokenLogo } from '@/components/TokenLogo';
import { AnimatedValue } from '@/components/AnimatedValue';
import { Freshness } from '@/components/Freshness';

interface MarketHeaderProps {
  markets: MarketInfo[];
  selectedMarket: MarketInfo;
  onSelectMarket: (market: MarketInfo) => void;
  markPrice: number;
  priceChange24h?: number | null;
  fundingRate8h?: number | null;
  indexPrice?: number | null;
  openInterestUsd?: number | null;
  priceStatus: string;
  markUpdatedAt: number;
  markStale: boolean;
  fundingWindow: number | null;
}

export function MarketHeader({
  markets,
  selectedMarket,
  onSelectMarket,
  markPrice,
  priceChange24h,
  fundingRate8h,
  indexPrice,
  openInterestUsd,
  priceStatus,
  markUpdatedAt,
  markStale,
  fundingWindow,
}: MarketHeaderProps) {
  return (
    <section className="market-strip" aria-label="Market overview">
      <h1 className="sr-only">{selectedMarket.baseSymbol} perpetual trading terminal</h1>
      <Select.Root
        value={selectedMarket.poolAddress}
        onValueChange={(pool) => {
          const market = markets.find((m) => m.poolAddress === pool);
          if (market) onSelectMarket(market);
        }}
      >
        <Select.Trigger className="market-selector" aria-label="Select perpetual market">
          <TokenLogo symbol={selectedMarket.baseSymbol} size={36} />
          <span>
            <span className="instrument-name">
              <Select.Value>{selectedMarket.baseSymbol}-PERP</Select.Value>
            </span>
            <span className="eyebrow block">Perpetual · USDso</span>
          </span>
          <ChevronDown size={16} className="muted" aria-hidden="true" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Content className="select-content" position="popper" sideOffset={6}>
            <Select.Viewport>
              {markets.map((market) => (
                <Select.Item className="select-item" value={market.poolAddress} key={market.id}>
                  <TokenLogo symbol={market.baseSymbol} />
                  <Select.ItemText>{market.baseSymbol}-PERP</Select.ItemText>
                  <Select.ItemIndicator>
                    <Check size={14} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <dl className="market-stats">
        <div className="market-stat primary">
          <dt>
            Mark price{' '}
            <HelpTip label="mark price">
              Protocol reference for unrealized PnL and margin checks. Execution prices can differ.
            </HelpTip>
          </dt>
          <dd>{markPrice > 0 ? <AnimatedValue key={selectedMarket.poolAddress} value={markPrice} digits={Math.max(1, selectedMarket.tickSize.split('.')[1]?.length || 0)} flash /> : '—'}</dd>
        </div>
        <div className="market-stat">
          <dt>Index price</dt>
          <dd>{indexPrice != null ? formatDynamicPrice(indexPrice) : '—'}</dd>
        </div>
        <div className="market-stat change">
          <dt>
            24h change{' '}
            <HelpTip label="24-hour change">
              Hourly snapshot: the last completed execution candle close versus the close 24 hours
              earlier. Unavailable when either hour is missing. This is not a rolling live ticker.
            </HelpTip>
          </dt>
          <dd
            className={priceChange24h == null ? '' : priceChange24h >= 0 ? 'positive' : 'negative'}
          >
            {priceChange24h == null
              ? '—'
              : `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(2)}%`}
          </dd>
        </div>
        <div className="market-stat">
          <dt>
            Funding / 8h{' '}
            <HelpTip label="funding">
              Periodic transfers between longs and shorts. A positive rate means longs pay shorts;
              this is the current rate × 28,800 ÷ the contract’s calculation window ({fundingWindow == null ? 'unavailable' : `${fundingWindow.toLocaleString('en-US')} seconds`}), with 1e18 precision. Settlement frequency is separate; this is not an APR.
            </HelpTip>
          </dt>
          <dd>
            {fundingRate8h == null
              ? '—'
              : `${fundingRate8h >= 0 ? '+' : ''}${(fundingRate8h * 100).toFixed(4)}%`}
          </dd>
        </div>
        <div className="market-stat">
          <dt>
            Open interest{' '}
            <HelpTip label="open interest">
              Outstanding base position quantity multiplied by the current mark, in USDso notional.
            </HelpTip>
          </dt>
          <dd>
            {openInterestUsd == null
              ? '—'
              : new Intl.NumberFormat('en-US', {
                  notation: 'compact',
                  maximumFractionDigits: 2,
                }).format(openInterestUsd)}
          </dd>
        </div>
      </dl>
      <div className="market-source">
        <Freshness updatedAt={markUpdatedAt} stale={markStale} label="mark read" />
        <div title={priceStatus}>{markStale ? priceStatus : 'On-chain mark · 3s poll'}</div>
      </div>
    </section>
  );
}
