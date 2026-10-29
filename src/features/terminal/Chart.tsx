import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  createChart,
  ColorType,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type UTCTimestamp,
  type CandlestickData,
  type AutoscaleInfo,
} from 'lightweight-charts';
import { RotateCcw } from 'lucide-react';
import { fetchMarketCandles } from '@/lib/data/indexer';
import { formatDynamicPrice } from '@/lib/math/format';
import { robustCandleScale } from '@/lib/math/chartScale';
import type { PositionItem } from '@/features/portfolio/PositionsTable';
import { AnimatedValue } from '@/components/AnimatedValue';
import { Freshness } from '@/components/Freshness';
import { LoadingState } from '@/components/LoadingState';
import { HelpTip } from '@/components/HelpTip';

const INTERVALS = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '4h', seconds: 14400 },
  { label: '1d', seconds: 86400 },
];

export function Chart({
  poolAddress,
  symbol,
  currentMarkPrice,
  tickSize,
  position,
}: {
  poolAddress: string;
  symbol: string;
  currentMarkPrice: number;
  tickSize: string;
  position?: PositionItem;
}) {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const candles = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volume = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markLine = useRef<IPriceLine | null>(null);
  const fitted = useRef<number | null>(null);
  const [interval, setInterval] = useState(3600);
  const [hovered, setHovered] = useState<CandlestickData | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const [robust, setRobust] = useState(true);
  const [range, setRange] = useState<{ from: number; to: number } | null>(null);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const query = useQuery({
    queryKey: ['candles', poolAddress, interval],
    queryFn: () => fetchMarketCandles(poolAddress, interval),
    refetchInterval: 15000,
    retry: 1,
  });
  const last = query.data?.at(-1);
  const inspected = hovered || last;
  const oldExecutions = !!last && now / 1000 - last.time > interval * 2;
  const stale = query.isError || now - query.dataUpdatedAt > 45000;
  const scale = useMemo(() => robustCandleScale(
    range ? (query.data || []).slice(Math.max(0, Math.floor(range.from)), Math.ceil(range.to) + 1) : query.data || [],
    currentMarkPrice
  ), [query.data, range, currentMarkPrice]);
  const scaleRef = useRef<{ robust: boolean; scale: typeof scale }>({ robust, scale });

  useEffect(() => {
    if (!container.current) return;
    const api = createChart(container.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#111111' },
        textColor: '#a8a8a8',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 11,
      },
      grid: { vertLines: { visible: false }, horzLines: { color: '#252525' } },
      rightPriceScale: { borderVisible: false, scaleMargins: { top: 0.12, bottom: 0.22 } },
      timeScale: {
        borderColor: '#252525',
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 5,
        barSpacing: 7,
      },
      crosshair: {
        mode: 0,
        vertLine: { color: '#777777', labelBackgroundColor: '#252525' },
        horzLine: { color: '#777777', labelBackgroundColor: '#252525' },
      },
      handleScroll: { vertTouchDrag: false },
    });
    const precision = tickSize.includes('.') ? tickSize.split('.')[1].replace(/0+$/, '').length : 0;
    const series = api.addCandlestickSeries({
      upColor: '#60cf9f',
      downColor: '#f4808b',
      wickUpColor: '#60cf9f',
      wickDownColor: '#f4808b',
      borderVisible: false,
      title: 'Last',
      autoscaleInfoProvider: (original: () => AutoscaleInfo | null) => {
        const view = scaleRef.current;
        return view.robust && view.scale ? { priceRange: view.scale.priceRange } : original();
      },
      priceFormat: { type: 'price', precision, minMove: Number(tickSize) },
    });
    const histogram = api.addHistogramSeries({
      priceScaleId: '',
      priceFormat: { type: 'volume' },
      lastValueVisible: false,
      priceLineVisible: false,
    });
    histogram.priceScale().applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    api.subscribeCrosshairMove((event) => {
      const data = event.seriesData.get(series);
      setHovered(data && 'open' in data ? (data as CandlestickData) : null);
      setCursor(event.point && data && 'open' in data ? {
        x: Math.max(8, Math.min(event.point.x + 16, (container.current?.clientWidth || 320) - 202)),
        y: Math.max(8, Math.min(event.point.y + 16, (container.current?.clientHeight || 300) - 170)),
      } : null);
    });
    api.timeScale().subscribeVisibleLogicalRangeChange((visible) => setRange(visible));
    chart.current = api;
    candles.current = series;
    volume.current = histogram;
    return () => {
      api.remove();
      chart.current = null;
      candles.current = null;
      volume.current = null;
      markLine.current = null;
      fitted.current = null;
    };
  }, [tickSize]);

  useEffect(() => {
    scaleRef.current = { robust, scale };
    // Recompute only the view; the series retains every original execution high/low.
    chart.current?.priceScale('right').applyOptions({ autoScale: true });
  }, [robust, scale]);

  useEffect(() => {
    candles.current?.setData(
      (query.data || []).map((c) => ({ ...c, time: c.time as UTCTimestamp }))
    );
    volume.current?.setData(
      (query.data || []).map((c) => ({
        time: c.time as UTCTimestamp,
        value: c.volume,
        color: c.close >= c.open ? '#60cf9f35' : '#f4808b35',
      }))
    );
    if (query.data?.length && fitted.current !== interval) {
      chart.current?.timeScale().fitContent();
      fitted.current = interval;
    }
  }, [query.data, interval]);

  useEffect(() => {
    if (!candles.current) return;
    if (markLine.current) {
      candles.current.removePriceLine(markLine.current);
      markLine.current = null;
    }
    if (currentMarkPrice > 0)
      markLine.current = candles.current.createPriceLine({
        price: currentMarkPrice,
        color: '#bc93f3',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Mark',
      });
  }, [currentMarkPrice]);

  useEffect(() => {
    const series = candles.current;
    if (!series || !position) return;
    const lines: IPriceLine[] = [];
    if (position.entryPrice > 0) lines.push(series.createPriceLine({
      price: position.entryPrice, color: '#e6e6e6', lineWidth: 1,
      lineStyle: LineStyle.Dotted, axisLabelVisible: true, title: 'Entry',
    }));
    if (position.liquidationPrice != null && position.liquidationPrice > 0) lines.push(series.createPriceLine({
      price: position.liquidationPrice, color: '#e5b875', lineWidth: 1,
      lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: 'Est. liq',
    }));
    return () => { for (const line of lines) series.removePriceLine(line); };
  }, [position]);

  return (
    <>
      <div className="chart-toolbar">
        <span className="chart-heading">
          {symbol}-PERP <span className="muted font-normal">/ Execution price</span>
        </span>
        <div className="timeframes" role="group" aria-label="Chart timeframes">
          {INTERVALS.map((item) => (
            <button
              key={item.seconds}
              aria-label={`Timeframe ${item.label}`}
              aria-pressed={interval === item.seconds}
              onClick={() => {
                setHovered(null);
                setInterval(item.seconds);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button
          className="icon-button"
          aria-label="Reset chart view"
          onClick={() => {
            chart.current?.priceScale('right').applyOptions({ autoScale: true });
            chart.current?.timeScale().fitContent();
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
        </button>
      </div>
      <div className="chart-scale-controls">
        <div className="scale-toggle" role="group" aria-label="Chart price scale">
          <button aria-pressed={robust} onClick={() => setRobust(true)}>Robust scale</button>
          <button aria-pressed={!robust} onClick={() => setRobust(false)}>Full range</button>
        </div>
        <HelpTip label="robust chart scale">View-only scaling uses median close and deviation, includes all candle bodies and the mark, and may put unusual wicks outside the viewport. Original OHLC remains available in the cursor tooltip. Full range restores every visible candle’s high and low.</HelpTip>
        {robust && !!scale?.outliers && <span className="caution" data-testid="chart-outliers">{scale.outliers} candle{scale.outliers === 1 ? '' : 's'} beyond robust bounds · <button className="underline" onClick={() => setRobust(false)}>Show full range</button></span>}
      </div>
      <div className="chart-ohlc" role="group" aria-label="Candle prices" aria-live="off">
        {(['open', 'high', 'low', 'close'] as const).map((key) => (
          <span key={key}>
            <b>{key[0].toUpperCase()}</b>
            {inspected ? formatDynamicPrice(inspected[key]) : '—'}
          </span>
        ))}
        <span className="muted">USDso</span>
        {inspected && (
          <time className="muted" dateTime={new Date(Number(inspected.time) * 1000).toISOString()}>
            {new Date(Number(inspected.time) * 1000).toISOString().slice(5, 16).replace('T', ' ')}{' '}
            UTC
          </time>
        )}
      </div>
      <div className="chart-reference" role="group" aria-label="Chart price references">
        <span>Last {last ? <AnimatedValue value={last.close} digits={Math.max(1, tickSize.split('.')[1]?.length || 0)} flash /> : '—'}</span>
        <span className="brand-text">Mark {currentMarkPrice > 0 ? formatDynamicPrice(currentMarkPrice) : '—'}</span>
        {position && <span title={`Portfolio snapshot block ${position.readBlock}; other market marks held constant.`}>Entry {formatDynamicPrice(position.entryPrice)} · <span className="caution">Est. liq {position.liquidationPrice == null ? '—' : formatDynamicPrice(position.liquidationPrice)}</span></span>}
      </div>
      <p id="chart-keyboard-help" className="sr-only">
        Use left and right arrows to inspect candles, Home or End to jump, and plus or minus to
        zoom. OHLC values and UTC time appear above.
      </p>
      <div className="chart-viewport">
        <div
          ref={container}
          className="chart-canvas"
          role="group"
          tabIndex={0}
          aria-label={`${symbol} execution candlesticks`}
          aria-describedby="chart-keyboard-help"
          onKeyDown={(event) => {
            const data = query.data;
            const api = chart.current;
            if (!data?.length || !api || !candles.current) return;
            const range = api.timeScale().getVisibleLogicalRange();
            if ((event.key === '+' || event.key === '=' || event.key === '-') && range) {
              event.preventDefault();
              const delta = (range.to - range.from) * (event.key === '-' ? 0.1 : -0.1);
              if (range.to - range.from + delta * 2 >= 5)
                api
                  .timeScale()
                  .setVisibleLogicalRange({ from: range.from - delta, to: range.to + delta });
              return;
            }
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const current = data.findIndex((candle) => candle.time === Number(inspected?.time));
            const index =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? data.length - 1
                  : Math.max(
                      0,
                      Math.min(data.length - 1, current + (event.key === 'ArrowLeft' ? -1 : 1))
                    );
            const candle = data[index];
            if (range && (index < range.from || index > range.to)) {
              const span = range.to - range.from;
              api
                .timeScale()
                .setVisibleLogicalRange({ from: index - span / 2, to: index + span / 2 });
            }
            api.setCrosshairPosition(candle.close, candle.time as UTCTimestamp, candles.current);
            setHovered({ ...candle, time: candle.time as UTCTimestamp });
          }}
        />
        {cursor && hovered && <div className="chart-tooltip" style={{ left: cursor.x, top: cursor.y }} aria-hidden="true">
          <strong>{new Date(Number(hovered.time) * 1000).toISOString().slice(0, 16).replace('T', ' ')} UTC</strong>
          {(['open', 'high', 'low', 'close'] as const).map(key => <div key={key}><span>{key}</span><b>{formatDynamicPrice(hovered[key])}</b></div>)}
          <div><span>Volume ({symbol})</span><b>{query.data?.find(c => c.time === Number(hovered.time))?.volume.toLocaleString('en-US', { maximumFractionDigits: 6 })}</b></div>
          <span className="muted">Original execution OHLC · USDso</span>
        </div>}
        {query.isPending ? (
          <div className="chart-overlay" role="status">
            <LoadingState label="Loading execution candles…" onRetry={() => void query.refetch()} />
            <span className="muted">Reading dreamDEX indexed fills</span>
          </div>
        ) : query.isError && !last ? (
          <div className="chart-overlay" role="status">
            <strong>Chart data unavailable</strong>
            <span className="muted">The indexer could not provide valid candles.</span>
            <button className="button" onClick={() => void query.refetch()}>
              Retry chart
            </button>
          </div>
        ) : !last ? (
          <div className="chart-overlay" role="status">
            <strong>No executions in this timeframe</strong>
            <span className="muted">Select another interval or market.</span>
          </div>
        ) : null}
      </div>
      <div className="chart-caption">
        <Freshness updatedAt={query.dataUpdatedAt} stale={stale} label="indexer read" />
        <span className={query.isError || oldExecutions ? 'caution' : ''}>
          {query.isError
            ? 'Refresh failed · showing previous candles'
            : oldExecutions
              ? 'No recent indexed executions'
              : 'Indexed executions · refresh 15s'}
          {query.isError && (
            <button className="ml-2 underline" onClick={() => void query.refetch()}>
              Retry
            </button>
          )}
        </span>
        <span>
          UTC ·{' '}
          <a href="https://www.tradingview.com/" target="_blank" rel="noreferrer">
            TradingView Lightweight Charts ↗
          </a>
        </span>
      </div>
    </>
  );
}
