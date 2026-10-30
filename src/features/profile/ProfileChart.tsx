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
  const path = points
    .map((p, i) => `${i ? 'H' : 'M'}${x(p.time)}${i ? 'V' : ','}${y(p.value)}`)
    .join(' ');
  return (
    <div className="profile-chart">
      <svg
        viewBox="0 0 900 270"
        role="img"
        aria-label={`${mode === 'pnl' ? 'Cumulative indexed realized price PnL' : 'Daily indexed fill volume'} in USDso. ${points.length} observations. Final value ${numberText(points.at(-1)?.value)}. Accessible values below.`}
      >
        {[0, 0.5, 1].map((fraction) => (
          <g key={fraction}>
            <line
              x1="72"
              x2="872"
              y1={40 + fraction * 180}
              y2={40 + fraction * 180}
              stroke="var(--border-color)"
            />
            <text x="60" y={44 + fraction * 180} textAnchor="end">
              {numberText(max - fraction * (max - min), 2)}
            </text>
          </g>
        ))}
        {mode === 'pnl' ? (
          <>
            <path d={path} fill="none" stroke="var(--color-cyan)" strokeWidth="2" />
            {points.map((p, i) => (
              <circle key={i} cx={x(p.time)} cy={y(p.value)} r="3" fill="var(--color-cyan)" />
            ))}
          </>
        ) : (
          points.map((p, i) => (
            <rect
              key={i}
              x={Math.max(72, x(p.time) - 6)}
              y={y(p.value)}
              width="12"
              height={Math.max(1, 220 - y(p.value))}
              rx="2"
              fill="var(--color-cyan)"
            />
          ))
        )}
        <text x="72" y="252">
          {utc(start).slice(0, 16)}
        </text>
        <text x="872" y="252" textAnchor="end">
          {utc(end).slice(0, 16)} UTC
        </text>
      </svg>
      <details className="chart-values">
        <summary>View chart values</summary>
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
