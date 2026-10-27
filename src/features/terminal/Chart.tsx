import React, { useEffect, useRef, useState } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { fetchMarketCandles } from '@/lib/data/indexer';

interface ChartProps {
  poolAddress: string;
  symbol: string;
  currentMarkPrice: number;
}

const INTERVALS = [
  { label: '1m', seconds: 60 },
  { label: '5m', seconds: 300 },
  { label: '15m', seconds: 900 },
  { label: '1h', seconds: 3600 },
  { label: '4h', seconds: 14400 },
  { label: '1d', seconds: 86400 },
];

export const Chart: React.FC<ChartProps> = ({ poolAddress, symbol, currentMarkPrice }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [activeInterval, setActiveInterval] = useState<number>(3600);
  const [loading, setLoading] = useState<boolean>(true);
  const [noIndexerData, setNoIndexerData] = useState<boolean>(false);

  // Initialize Lightweight Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#070a0e' },
        textColor: '#94a3b8',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: 'rgba(26, 37, 54, 0.4)' },
        horzLines: { color: 'rgba(26, 37, 54, 0.4)' },
      },
      crosshair: {
        mode: 1,
      },
      timeScale: {
        borderColor: '#1a2536',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1a2536',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      width: chartContainerRef.current.clientWidth,
      height: 480,
    });

    // Lightweight charts v4 syntax
    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // overlay
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, []);

  // Fetch real candles on interval or pool change
  useEffect(() => {
    let active = true;

    async function loadData() {
      setLoading(true);
      try {
        const candles = await fetchMarketCandles(poolAddress, activeInterval);
        if (!active) return;

        if (candles.length > 0 && candleSeriesRef.current && volumeSeriesRef.current) {
          setNoIndexerData(false);
          // Format candles for lightweight-charts
          const chartCandles = candles.map((c) => ({
            time: c.time as any,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
          }));

          const volumes = candles.map((c) => ({
            time: c.time as any,
            value: c.volume,
            color: c.close >= c.open ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)',
          }));

          candleSeriesRef.current.setData(chartCandles);
          volumeSeriesRef.current.setData(volumes);
          chartRef.current?.timeScale().fitContent();
        } else if (candleSeriesRef.current) {
          setNoIndexerData(true);
          // Testnet indexer has no historical candles yet — build a live baseline
          // from the mark price so the chart is never fully blank.
          const price = currentMarkPrice > 0 ? currentMarkPrice : 80000;
          const now = Math.floor(Date.now() / 1000);
          const snapCount = 6;
          const snapData = Array.from({ length: snapCount }, (_, i) => ({
            time: (now - (snapCount - i) * activeInterval) as any,
            open: price,
            high: price,
            low: price,
            close: price,
          }));
          candleSeriesRef.current.setData(snapData);
          volumeSeriesRef.current?.setData([]);
          chartRef.current?.timeScale().fitContent();
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadData();
    return () => {
      active = false;
    };
  }, [poolAddress, activeInterval, currentMarkPrice]);

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl overflow-hidden flex flex-col">
      {/* Chart Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a2536] bg-[#070a0e]/50 text-xs">
        <div className="flex items-center space-x-2">
          <span className="font-bold text-white font-mono">{symbol}-PERP</span>
          <span className="text-slate-500">·</span>
          <span className="text-cyan-400 font-mono">Candles (Indexed)</span>
        </div>

        <div className="flex items-center space-x-1">
          {INTERVALS.map((int) => (
            <button
              key={int.seconds}
              onClick={() => setActiveInterval(int.seconds)}
              aria-label={`Timeframe ${int.label}`}
              className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                activeInterval === int.seconds
                  ? 'bg-cyan-500/20 text-cyan-400 font-bold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {int.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Viewport */}
      <div className="relative w-full h-[480px]">
        {loading && (
          <div className="absolute inset-0 bg-[#070a0e]/70 backdrop-blur-xs flex items-center justify-center z-10">
            <div className="text-xs font-mono text-cyan-400 flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Loading on-chain candles...</span>
            </div>
          </div>
        )}
        {!loading && noIndexerData && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-[#0d131d]/90 border border-yellow-500/30 rounded px-3 py-1 text-[10px] font-mono text-yellow-400/70">
            Testnet indexer has no candle history · showing live mark price baseline
          </div>
        )}
        <div ref={chartContainerRef} className="w-full h-full" />
      </div>
    </div>
  );
};
