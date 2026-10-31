import { Shield, ArrowUpRight } from 'lucide-react';
import { Freshness } from '@/components/Freshness';
import { LoadingState } from '@/components/LoadingState';
import { HelpTip } from '@/components/HelpTip';

export function GuardianOverview({ equity, maintenance, loading, stale, updatedAt, connected, onOpen, onRetry }: {
  equity: number | null; maintenance: number | null; loading: boolean; stale: boolean;
  updatedAt: number; connected: boolean; onOpen: () => void; onRetry: () => void;
}) {
  const available = connected && equity !== null && maintenance !== null && !stale;
  const ratio = available && maintenance > 0 ? equity / maintenance : null;
  const noExposure = available && maintenance === 0;
  const warning = ratio !== null && ratio < 1.5;
  const status = !connected ? 'Connect wallet to view risk' : loading ? 'Reading account health' : !available ? 'Health unavailable' : noExposure ? 'No maintenance exposure' : ratio! <= 1 ? 'Below maintenance' : warning ? 'Low margin buffer' : 'Margin buffer';
  const angle = ratio === null ? null : Math.max(0, Math.min(1, ratio / 5)) * 180;
  return <section className="guardian-overview" aria-label="Guardian overview" data-warning={warning}>
    <div className="guardian-identity">
      <span className="guardian-label"><Shield size={17} aria-hidden="true" /> LUCIDKEEPER GUARDIAN</span>
      <h2>{status}</h2>
      <p>{connected ? 'Connected account · Cross-margin health' : 'Your account health appears after connection'}</p>
    </div>
    <div className="guardian-gauge" role="img" aria-label={`Account health: ${ratio === null ? status : `${ratio.toFixed(2)} times maintenance`}. Gauge scale 0 to 5 times.`}>
      <svg viewBox="0 0 160 94" aria-hidden="true">
        <path className="gauge-track" d="M12 80 A68 68 0 0 1 148 80" />
        <path className="gauge-warning" d="M12 80 A68 68 0 0 1 25 40" />
        {angle !== null && <g className="gauge-needle" style={{ transform: `rotate(${angle}deg)` }}><path d="M80 80 H20" /><circle cx="80" cy="80" r="4" /></g>}
        <text x="80" y="62" textAnchor="middle">{ratio === null ? '—' : `${ratio.toFixed(2)}×`}</text>
        <text className="gauge-end" x="10" y="93">0</text><text className="gauge-end" x="133" y="93">5×+</text>
      </svg>
    </div>
    <div className="guardian-health">
      {loading ? <LoadingState label="Reading equity and maintenance…" onRetry={onRetry} /> : <>
        <dl>
          <div><dt>Account equity</dt><dd>{available ? equity.toFixed(2) : '—'} <small>USDso</small></dd></div>
          <div><dt>Maintenance <HelpTip label="account health">Health = total account equity ÷ maintenance requirement. Both are read from MarginBank at one block. A ratio of 1× is the maintenance threshold. No requirement means no gauge ratio, not infinite safety.</HelpTip></dt><dd>{available ? maintenance.toFixed(2) : '—'} <small>USDso</small></dd></div>
        </dl>
        {connected && <Freshness updatedAt={updatedAt} stale={stale} label="account health read" />}
      </>}
    </div>
    <div className="guardian-action">
      <button className="button guardian-button" onClick={onOpen}>Open risk controls <ArrowUpRight size={15} aria-hidden="true" /></button>
      <span>Browser-local triggers · wallet approval</span>
      {connected && !loading && !available && <button className="text-violet-300" onClick={onRetry}>Retry account reads</button>}
    </div>
  </section>;
}
