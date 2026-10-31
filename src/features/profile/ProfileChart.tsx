import React, { useState, useRef } from 'react';
import { numberText, utc } from './profileData';

/**
 * Builds a smooth Catmull-Rom spline converted to cubic Bézier commands.
 * Guarantees a continuous, silky curve with no harsh vertical staircase steps.
 */
function buildSmoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  if (pts.length === 2) {
    return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;
  }

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];

    // Smooth control points (tension = 1/6)
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

export function ProfileChart({
  points,
  mode,
  start,
  end,
}: {
  points: { time: number; value: number }[];
  mode: 'pnl' | 'volume';
  start: number;
  end: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!points.length)
    return (
      <div className="profile-empty chart-empty">
        <h3>No observations in this window</h3>
        <p>Choose another time window. No synthetic points are drawn.</p>
      </div>
    );

  const values = points.map((p) => p.value);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const x = (time: number) => 72 + ((time - start) / Math.max(1, end - start)) * 800;
  const y = (value: number) => 220 - ((value - min) / range) * 180;
  const zeroY = Math.max(38, Math.min(222, y(0)));

  const mapped = points.map((p) => ({
    x: x(p.time),
    y: y(p.value),
    time: p.time,
    value: p.value,
  }));
  const smoothCurve = buildSmoothPath(mapped);

  const firstPt = mapped[0];
  const lastPt = mapped[mapped.length - 1];
  const areaPath =
    mapped.length > 1
      ? `${smoothCurve} L ${lastPt.x.toFixed(1)} 220 L ${firstPt.x.toFixed(1)} 220 Z`
      : '';

  const finalVal = lastPt?.value ?? 0;
  const isProfitable = finalVal >= 0;
  const strokeColor = mode === 'pnl' ? (isProfitable ? '#60cf9f' : '#f4808b') : '#bc93f3';

  const activePoint = hoverIndex !== null && mapped[hoverIndex] ? mapped[hoverIndex] : lastPt;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || mapped.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * 900;

    let closestIdx = 0;
    let minDist = Infinity;
    for (let i = 0; i < mapped.length; i++) {
      const dist = Math.abs(mapped[i].x - mouseSvgX);
      if (dist < minDist) {
        minDist = dist;
        closestIdx = i;
      }
    }
    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="profile-chart">
      {/* Interactive HUD Telemetry Bar */}
      <div className="chart-telemetry-hud">
        <div className="hud-metric">
          <span className="hud-metric-label">
            {hoverIndex !== null ? 'INSPECTED' : 'LATEST'}{' '}
            {mode === 'pnl' ? 'REALIZED PnL' : 'VOLUME'}
          </span>
          <span
            className={`hud-metric-value numeric ${
              mode === 'pnl'
                ? activePoint.value >= 0
                  ? 'text-positive'
                  : 'text-negative'
                : 'text-violet'
            }`}
          >
            {mode === 'pnl' && activePoint.value > 0 ? '+' : ''}
            {numberText(activePoint.value, 4)} USDso
          </span>
        </div>
        <div className="hud-timestamp">
          <span className="hud-time-utc">{utc(activePoint.time)} UTC</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox="0 0 900 270"
        role="img"
        aria-label={`${
          mode === 'pnl' ? 'Cumulative indexed realized price PnL' : 'Daily indexed fill volume'
        } in USDso. ${points.length} observations. Final value ${numberText(
          points.at(-1)?.value
        )}. Accessible values below.`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <defs>
          <linearGradient id="pnlFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="50%" stopColor={strokeColor} stopOpacity="0.08" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bc93f3" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#771be8" stopOpacity="0.35" />
          </linearGradient>
          <filter id="pnlGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal subtle gridlines */}
        {[0, 0.5, 1].map((fraction) => {
          const gridY = 40 + fraction * 180;
          return (
            <g key={fraction} className="chart-grid-group">
              <line
                x1="72"
                x2="872"
                y1={gridY}
                y2={gridY}
                stroke="rgba(188, 147, 243, 0.07)"
                strokeDasharray="4 4"
              />
              <text
                x="62"
                y={gridY + 4}
                textAnchor="end"
                className="chart-axis-label"
                fill="#8d849f"
              >
                {numberText(max - fraction * (max - min), 2)}
              </text>
            </g>
          );
        })}

        {/* Zero baseline */}
        <line
          x1="72"
          x2="872"
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(188, 147, 243, 0.18)"
          strokeWidth="1"
          strokeDasharray="2 3"
        />

        {mode === 'pnl' ? (
          <>
            {/* Area fill under smooth curve */}
            {areaPath && <path d={areaPath} fill="url(#pnlFillGrad)" />}

            {/* Smooth Bézier PnL Curve */}
            <path
              d={smoothCurve}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#pnlGlow)"
            />

            {/* Point markers if count <= 40 */}
            {mapped.length <= 40 &&
              mapped.map((p, i) => (
                <circle
                  key={i}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIndex === i ? 5 : 2.5}
                  fill="#0c0b12"
                  stroke={strokeColor}
                  strokeWidth={hoverIndex === i ? 2.5 : 1.5}
                  className="chart-point"
                />
              ))}

            {/* Crosshair & Halo on active point */}
            {activePoint && (
              <g className="chart-crosshair">
                <line
                  x1={activePoint.x}
                  x2={activePoint.x}
                  y1={35}
                  y2={225}
                  stroke="rgba(188, 147, 243, 0.35)"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={7}
                  fill={strokeColor}
                  fillOpacity="0.25"
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={3.5}
                  fill="#ffffff"
                  stroke={strokeColor}
                  strokeWidth="2"
                />
              </g>
            )}
          </>
        ) : (
          /* Volume Bars */
          points.map((p, i) => {
            const barHeight = Math.max(3, 220 - y(p.value));
            const barY = 220 - barHeight;
            const barWidth = Math.max(6, Math.min(24, 750 / points.length));
            const isHovered = hoverIndex === i;
            return (
              <g key={i}>
                <rect
                  x={Math.max(72, x(p.time) - barWidth / 2)}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx="4"
                  fill={isHovered ? '#bc93f3' : 'url(#volBarGrad)'}
                  opacity={isHovered ? 1 : 0.85}
                  className="chart-vol-bar"
                />
              </g>
            );
          })
        )}

        {/* Time X-axis labels */}
        <text x="72" y="254" className="chart-time-label" fill="#8d849f">
          {utc(start).slice(0, 16)} UTC
        </text>
        <text x="872" y="254" textAnchor="end" className="chart-time-label" fill="#8d849f">
          {utc(end).slice(0, 16)} UTC
        </text>
      </svg>

      <details className="chart-values">
        <summary>View detailed observations ({points.length} data points)</summary>
        <div role="region" aria-label="Chart observations" tabIndex={0}>
          {points.map((p, i) => (
            <p key={i}>
              <time>{utc(p.time)} UTC</time>
              <span className="numeric">{numberText(p.value, 8)} USDso</span>
            </p>
          ))}
        </div>
      </details>
    </div>
  );
}
