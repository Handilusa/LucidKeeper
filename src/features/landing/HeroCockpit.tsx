import { useState, useMemo } from 'react';
import {
  ArrowUpRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Layers,
  Cpu,
} from 'lucide-react';
import './hero-cockpit.css';

interface MarketData {
  id: string;
  symbol: string;
  pair: string;
  price: number;
  priceDecimals: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  lotSize: string;
  tickSize: string;
  points: number[];
}

const MARKETS: Record<string, MarketData> = {
  BTC: {
    id: 'BTC',
    symbol: 'BTC',
    pair: 'BTC-PERP',
    price: 76755.3,
    priceDecimals: 1,
    change24h: -2.7,
    high24h: 77868.0,
    low24h: 74680.0,
    volume24h: '25.22M',
    lotSize: '0.0001 BTC',
    tickSize: '0.1 USDso',
    points: [
      76100, 76350, 76800, 77200, 77868, 77400, 76900, 76300, 75900, 75400,
      74680, 75100, 75600, 76200, 75800, 76100, 76500, 76250, 76800, 77100,
      76600, 76400, 76900, 76755.3,
    ],
  },
  AVAX: {
    id: 'AVAX',
    symbol: 'AVAX',
    pair: 'AVAX-PERP',
    price: 25.4,
    priceDecimals: 2,
    change24h: 4.15,
    high24h: 26.1,
    low24h: 24.25,
    volume24h: '8.45M',
    lotSize: '0.1 AVAX',
    tickSize: '0.01 USDso',
    points: [
      24.3, 24.45, 24.25, 24.6, 24.8, 24.7, 24.95, 25.1, 25.0, 25.3,
      25.15, 25.4, 25.2, 25.5, 25.75, 25.6, 25.9, 26.1, 25.8, 25.65,
      25.5, 25.45, 25.35, 25.4,
    ],
  },
  DOGE: {
    id: 'DOGE',
    symbol: 'DOGE',
    pair: 'DOGE-PERP',
    price: 0.07525,
    priceDecimals: 5,
    change24h: 1.8,
    high24h: 0.0768,
    low24h: 0.0734,
    volume24h: '14.10M',
    lotSize: '10 DOGE',
    tickSize: '0.00001 USDso',
    points: [
      0.0735, 0.0738, 0.0734, 0.074, 0.0744, 0.0741, 0.0748, 0.0752,
      0.0749, 0.0756, 0.0754, 0.0761, 0.0768, 0.0762, 0.0758, 0.0755,
      0.0759, 0.0761, 0.0754, 0.0751, 0.0753, 0.075, 0.0752, 0.07525,
    ],
  },
};

const LEVERAGES = [1, 2, 5, 10, 20];

export function HeroCockpit() {
  const [selectedMarketId, setSelectedMarketId] = useState<string>('BTC');
  const [tradeSide, setTradeSide] = useState<'long' | 'short'>('long');
  const [leverage, setLeverage] = useState<number>(5);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const market = MARKETS[selectedMarketId];

  // Price formatting
  const formattedPrice = useMemo(() => {
    return market.price.toLocaleString('en-US', {
      minimumFractionDigits: market.priceDecimals,
      maximumFractionDigits: market.priceDecimals,
    });
  }, [market]);

  // Sparkline coordinates
  const { pathD, areaD, svgPoints } = useMemo(() => {
    const pts = market.points;
    const min = Math.min(...pts);
    const max = Math.max(...pts);
    const range = max - min || 1;
    const w = 480;
    const h = 130;
    const padY = 12;

    const coords = pts.map((val, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - padY - ((val - min) / range) * (h - padY * 2);
      return { x, y, val };
    });

    const d = coords.reduce((acc, curr, idx) => {
      return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
    }, '');

    const area = `${d} L ${w} ${h} L 0 ${h} Z`;

    return { pathD: d, areaD: area, svgPoints: coords };
  }, [market]);

  // Risk & Sizing calculations
  const positionNotional = 500; // standard benchmark $500 USDso
  const marginRequired = positionNotional / leverage;
  const effectiveBuffer = (6.5 / (leverage / 5)).toFixed(2);

  // Liquidation calculation
  const estLiqPrice = useMemo(() => {
    const rawPrice = market.price;
    const mmBps = 0.05; // 5% maintenance
    const liqDistance = rawPrice / leverage - rawPrice * mmBps;
    const liq = tradeSide === 'long' ? rawPrice - liqDistance : rawPrice + liqDistance;
    return Math.max(0, liq).toLocaleString('en-US', {
      minimumFractionDigits: market.priceDecimals,
      maximumFractionDigits: market.priceDecimals,
    });
  }, [market, leverage, tradeSide]);

  // Buffer bar graduation (10 segments)
  const activeSegments = Math.max(2, Math.min(10, Math.round(Number(effectiveBuffer) * 1.5)));

  return (
    <div className="hero-cockpit-chassis" aria-label="Interactive LucidKeeper Perps Cockpit">
      {/* Precision Instrument Bezel Header */}
      <header className="cockpit-chassis-header">
        <div className="cockpit-identity-cluster">
          <span className="cockpit-status-beacon" title="Somnia Tokyo Testnet 50383 Online" />
          <div className="cockpit-identity-meta">
            <span className="cockpit-protocol-tag">LUCIDKEEPER // TACTICAL DESK</span>
            <span className="cockpit-chain-id">SOMNIA TOKYO (50383)</span>
          </div>
        </div>

        {/* Tactile Market Selector Switcher */}
        <div className="cockpit-market-selector" role="tablist" aria-label="Select market">
          {Object.values(MARKETS).map((m) => {
            const isSelected = m.id === selectedMarketId;
            return (
              <button
                key={m.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`cockpit-market-tab ${isSelected ? 'market-tab-active' : ''}`}
                onClick={() => setSelectedMarketId(m.id)}
              >
                <span className="market-tab-symbol">{m.symbol}</span>
                <span className={`market-tab-change ${m.change24h >= 0 ? 'pos' : 'neg'}`}>
                  {m.change24h >= 0 ? '+' : ''}
                  {m.change24h}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Hardware Telemetry Ledger */}
        <div className="cockpit-telemetry-cluster">
          <span className="telemetry-item">
            <Cpu size={12} className="telemetry-icon" aria-hidden="true" />
            <span className="telemetry-label">BLOCK</span>
            <strong className="telemetry-val">#37392617</strong>
          </span>
          <span className="telemetry-item">
            <span className="telemetry-dot-online" />
            <span className="telemetry-label">RPC</span>
            <strong className="telemetry-val">18ms</strong>
          </span>
        </div>
      </header>

      {/* Main Tactical Deck Body */}
      <div className="cockpit-deck-body">
        {/* Bay 1: Live Market & Precision Sparkline */}
        <section className="cockpit-bay bay-market" aria-label="Market Price and Chart">
          <div className="bay-market-header">
            <div className="market-price-group">
              <span className="market-pair-title">{market.pair}</span>
              <div className="market-price-row">
                <span className="market-price-value">${formattedPrice}</span>
                <span className={`market-badge-change ${market.change24h >= 0 ? 'pos' : 'neg'}`}>
                  {market.change24h >= 0 ? (
                    <TrendingUp size={12} aria-hidden="true" />
                  ) : (
                    <TrendingDown size={12} aria-hidden="true" />
                  )}
                  {market.change24h >= 0 ? '+' : ''}
                  {market.change24h}%
                </span>
              </div>
            </div>

            <div className="market-micro-stats">
              <div className="micro-stat">
                <span className="stat-label">24H HIGH</span>
                <span className="stat-val">${market.high24h.toLocaleString()}</span>
              </div>
              <div className="micro-stat">
                <span className="stat-label">24H LOW</span>
                <span className="stat-val">${market.low24h.toLocaleString()}</span>
              </div>
              <div className="micro-stat">
                <span className="stat-label">VOL</span>
                <span className="stat-val">${market.volume24h}</span>
              </div>
            </div>
          </div>

          {/* Precision Vector Chart Area */}
          <div
            className="cockpit-chart-container"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <svg
              className="cockpit-sparkline-svg"
              viewBox="0 0 480 130"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="cockpit-area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#771be8" stopOpacity="0.32" />
                  <stop offset="60%" stopColor="#771be8" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#771be8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="0" y1="30" x2="480" y2="30" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />
              <line x1="0" y1="65" x2="480" y2="65" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />
              <line x1="0" y1="100" x2="480" y2="100" stroke="rgba(255,255,255,0.04)" strokeDasharray="2 4" />

              {/* Chart curves */}
              <path d={areaD} fill="url(#cockpit-area-grad)" />
              <path d={pathD} fill="none" stroke="#bc93f3" strokeWidth="1.75" />

              {/* Hover crosshairs and indicator */}
              {hoverIndex !== null && svgPoints[hoverIndex] && (
                <>
                  <line
                    x1={svgPoints[hoverIndex].x}
                    y1="0"
                    x2={svgPoints[hoverIndex].x}
                    y2="130"
                    stroke="#bc93f3"
                    strokeWidth="1"
                    strokeDasharray="2 2"
                    opacity="0.8"
                  />
                  <circle
                    cx={svgPoints[hoverIndex].x}
                    cy={svgPoints[hoverIndex].y}
                    r="4"
                    fill="#771be8"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                </>
              )}
            </svg>

            {/* Interactive hover tracking hotspots */}
            <div className="chart-hotspots-overlay">
              {svgPoints.map((_, i) => (
                <div
                  key={i}
                  className="chart-hotspot-column"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              ))}
            </div>

            {/* Price Chip Tooltip */}
            {hoverIndex !== null && svgPoints[hoverIndex] && (
              <div
                className="chart-hover-chip"
                style={{
                  left: `${(svgPoints[hoverIndex].x / 480) * 100}%`,
                }}
              >
                <span>
                  $
                  {svgPoints[hoverIndex].val.toLocaleString('en-US', {
                    minimumFractionDigits: market.priceDecimals,
                    maximumFractionDigits: market.priceDecimals,
                  })}
                </span>
              </div>
            )}
          </div>

          <div className="bay-market-footer">
            <span className="oracle-badge">
              <span className="oracle-ping" /> dreamDEX Mark Oracle · On-Chain Feed
            </span>
            <span className="grid-spec">
              Lot: {market.lotSize} · Tick: {market.tickSize}
            </span>
          </div>
        </section>

        {/* Bay 2: The Signature Risk Guardian Instrument */}
        <section className="cockpit-bay bay-guardian" aria-label="Risk Guardian Buffer and Telemetry">
          <div className="bay-guardian-head">
            <div className="guardian-title-cluster">
              <ShieldCheck size={16} className="guardian-shield-icon" aria-hidden="true" />
              <strong className="guardian-brand">LUCIDKEEPER RISK GUARDIAN</strong>
            </div>
            <span className="guardian-state-badge">CLIENT TAB ARMED</span>
          </div>

          {/* Segmented Mechanical Health Meter */}
          <div className="guardian-meter-card">
            <div className="meter-header">
              <span className="meter-label">CROSS-MARGIN BUFFER</span>
              <span className="meter-ratio-val">
                {effectiveBuffer}x
                <span className="meter-status-tag">SAFE</span>
              </span>
            </div>

            <div className="segmented-gauge" role="meter" aria-valuenow={Number(effectiveBuffer)} aria-valuemin={1} aria-valuemax={10}>
              {Array.from({ length: 10 }).map((_, idx) => {
                const isLit = idx < activeSegments;
                const isWarning = idx < 2;
                return (
                  <span
                    key={idx}
                    className={`gauge-segment ${isLit ? (isWarning ? 'seg-warn' : 'seg-safe') : 'seg-dim'}`}
                  />
                );
              })}
            </div>

            <div className="meter-scale-markers">
              <span>1.0x (CRITICAL)</span>
              <span>3.0x (MAINTENANCE)</span>
              <span>10.0x+ (ISOLATED)</span>
            </div>
          </div>

          {/* Liquidation & Capital Telemetry Grid */}
          <div className="guardian-specs-grid">
            <div className="spec-tile">
              <span className="tile-label">EST. LIQUIDATION</span>
              <span className="tile-val-alert">${estLiqPrice}</span>
            </div>
            <div className="spec-tile">
              <span className="tile-label">MARGINBANK COLLATERAL</span>
              <span className="tile-val">$14.43 USDso</span>
            </div>
            <div className="spec-tile">
              <span className="tile-label">AUTONOMOUS SL/TP</span>
              <span className="tile-val-armed">ARMED (60 FPS)</span>
            </div>
            <div className="spec-tile">
              <span className="tile-label">EXECUTION PROTECTION</span>
              <span className="tile-val">IOC 2% BUFFER</span>
            </div>
          </div>
        </section>

        {/* Bay 3: Tactile Pre-Flight Intent Sizing */}
        <section className="cockpit-bay bay-sizing" aria-label="Trade Sizing and Pre-Flight Intent">
          <div className="bay-sizing-head">
            <span className="sizing-kicker">PRE-FLIGHT INTENT SIMULATOR</span>
            <span className="sizing-auth-tag">
              <Lock size={11} aria-hidden="true" /> NON-CUSTODIAL
            </span>
          </div>

          {/* Physical Side Rocker Switch */}
          <div className="intent-direction-switch" role="group" aria-label="Trade side">
            <button
              type="button"
              className={`direction-btn btn-long ${tradeSide === 'long' ? 'active' : ''}`}
              onClick={() => setTradeSide('long')}
            >
              LONG / BUY
            </button>
            <button
              type="button"
              className={`direction-btn btn-short ${tradeSide === 'short' ? 'active' : ''}`}
              onClick={() => setTradeSide('short')}
            >
              SHORT / SELL
            </button>
          </div>

          {/* Leverage Sizing Keys */}
          <div className="intent-leverage-matrix">
            <div className="leverage-label-row">
              <span className="matrix-title">LEVERAGE MULTIPLIER</span>
              <span className="current-lev-tag">{leverage}x</span>
            </div>
            <div className="leverage-keys-grid">
              {LEVERAGES.map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`leverage-key ${leverage === l ? 'leverage-key-active' : ''}`}
                  onClick={() => setLeverage(l)}
                >
                  {l}x
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Order Math */}
          <div className="intent-math-ledger">
            <div className="math-row">
              <span className="math-key">POSITION NOTIONAL</span>
              <span className="math-num">${positionNotional.toFixed(2)} USDso</span>
            </div>
            <div className="math-row">
              <span className="math-key">REQUIRED MARGIN</span>
              <span className="math-num highlight">${marginRequired.toFixed(2)} USDso</span>
            </div>
            <div className="math-row">
              <span className="math-key">EXECUTION DESTINATION</span>
              <span className="math-num mono">MarginBank 0x4787…1394</span>
            </div>
          </div>

          {/* Action Trigger Link */}
          <a
            href="/app"
            className="cockpit-launch-action"
            title="Open full trading terminal on Somnia Tokyo"
          >
            <span>LAUNCH WORKING TERMINAL</span>
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
        </section>
      </div>

      {/* Hardware Chassis Footer Status Line */}
      <footer className="cockpit-chassis-footer">
        <div className="chassis-guarantee-line">
          <CheckCircle2 size={13} className="check-icon" aria-hidden="true" />
          <span>ZERO PRIVATE KEYS ON DISK OR BACKEND · ALL TRANSACTIONS SIGNED BY YOUR CLIENT EOA</span>
        </div>
        <div className="chassis-hashes-proof">
          <Layers size={13} aria-hidden="true" />
          <span>CANONICAL TOKYO PROOFS: DOGE (#37392617) · AVAX (#37258319)</span>
        </div>
      </footer>
    </div>
  );
}
