import { numberText, utc } from './profileData';

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
  const zeroY = y(0);

  // Stepped or smooth path for PnL line
  const linePath = points
    .map((p, i) => `${i ? 'H' : 'M'}${x(p.time)}${i ? 'V' : ','}${y(p.value)}`)
    .join(' ');

  // Closed area polygon for soft gradient fill
  const firstPoint = points[0];
  const areaPath = `${linePath} V ${zeroY} H ${x(firstPoint.time)} Z`;

  const isProfitable = points.length > 0 && (points[points.length - 1]?.value ?? 0) >= 0;
  const strokeColor = mode === 'pnl' ? (isProfitable ? '#60cf9f' : '#f4808b') : '#bc93f3';

  return (
    <div className="profile-chart">
      <svg
        viewBox="0 0 900 270"
        role="img"
        aria-label={`${mode === 'pnl' ? 'Cumulative indexed realized price PnL' : 'Daily indexed fill volume'} in USDso. ${points.length} observations. Final value ${numberText(points.at(-1)?.value)}. Accessible values below.`}
      >
        <defs>
          <linearGradient id="pnlFillGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.22" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
          <linearGradient id="volBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bc93f3" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#771be8" stopOpacity="0.4" />
          </linearGradient>
          <filter id="lineGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction} className="chart-grid-group">
            <line
              x1="72"
              x2="872"
              y1={40 + fraction * 180}
              y2={40 + fraction * 180}
              stroke="rgba(188, 147, 243, 0.08)"
              strokeDasharray="4 4"
            />
            <text
              x="62"
              y={44 + fraction * 180}
              textAnchor="end"
              className="chart-axis-label"
              fill="#8d849f"
            >
              {numberText(max - fraction * (max - min), 2)}
            </text>
          </g>
        ))}

        {/* Zero baseline */}
        <line
          x1="72"
          x2="872"
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(188, 147, 243, 0.2)"
          strokeWidth="1"
        />

        {mode === 'pnl' ? (
          <>
            {/* Area fill */}
            <path d={areaPath} fill="url(#pnlFillGrad)" />
            {/* Main PnL Line */}
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#lineGlow)"
            />
            {/* Data points */}
            {points.map((p, i) => (
              <circle
                key={i}
                cx={x(p.time)}
                cy={y(p.value)}
                r={points.length > 30 ? 2 : 3.5}
                fill="#0c0b12"
                stroke={strokeColor}
                strokeWidth="1.5"
                className="chart-point"
              />
            ))}
          </>
        ) : (
          /* Volume Bars */
          points.map((p, i) => {
            const barHeight = Math.max(2, 220 - y(p.value));
            const barY = 220 - barHeight;
            return (
              <rect
                key={i}
                x={Math.max(72, x(p.time) - 6)}
                y={barY}
                width="12"
                height={barHeight}
                rx="3"
                fill="url(#volBarGrad)"
                className="chart-vol-bar"
              />
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
