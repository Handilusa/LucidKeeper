import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { observedAccounts, clearObservedAccounts } from '@/lib/data/observedAccounts';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { scopedProfileRows, participatesInFill } from '@/lib/data/profileMetrics';
import { profileClient, HISTORY_LIMIT, units, numberText } from './profileData';

/** Not a global profit ranking: only addresses actually connected in this browser. */
export function ObservedLeaderboard() {
  const [accounts, setAccounts] = useState(() => observedAccounts(localStorage));
  const [end] = useState(() => Math.floor(Date.now() / 1000));
  const queries = useQueries({ queries: accounts.map(account => ({
    queryKey: ['observed-volume', 50383, account, end - 604800, end], staleTime: 60000, retry: 1,
    queryFn: async () => {
      const fills = await profileClient.getUserFills(account, { since: end - 604800, until: end - 1, markets: ALL_VERIFIED_PERP_MARKETS.map(m => m.poolAddress), limit: HISTORY_LIMIT });
      const owned = scopedProfileRows(fills, account, end - 604800, end, ALL_VERIFIED_PERP_MARKETS.map(m => m.poolAddress), participatesInFill);
      return { volume: units(owned.reduce((sum, fill) => sum + BigInt(fill.quoteQuantity), 0n)), capped: fills.length >= HISTORY_LIMIT };
    },
  })) });
  const rows = accounts.map((account, i) => ({ account, query: queries[i] })).sort((a, b) => (b.query.data?.volume ?? -1) - (a.query.data?.volume ?? -1));
  return <section className="profile-methodology" aria-label="Observed-account leaderboard">
    <h2>Observed accounts · indexed volume</h2>
    <p>7D leaderboard of up to five addresses actually connected in this browser on Tokyo. Ranked by returned indexed fill notional, not profit, ROI or a global cohort. Up to {HISTORY_LIMIT} newest fills per address; lag/missing rows may affect comparisons.</p>
    {!rows.length ? <p>No connected accounts observed in this browser yet. No demo traders or fabricated ranks.</p> : <ol>{rows.map(({ account, query }) => <li key={account}>
      <a href={`/app/profile/${account}`}>{account}</a> · {query.isPending ? 'Reading…' : query.isError ? 'Volume unavailable' : `${numberText(query.data?.volume)} USDso indexed volume${query.data?.capped ? ' · capped rows' : ''}`}
    </li>)}</ol>}
    <button className="button" onClick={() => { clearObservedAccounts(localStorage); setAccounts([]); }}>Clear this browser’s account list</button>
  </section>;
}
