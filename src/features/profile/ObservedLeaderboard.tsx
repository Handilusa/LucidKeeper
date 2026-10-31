import { useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Trophy, Trash2, ExternalLink } from 'lucide-react';
import { observedAccounts, clearObservedAccounts } from '@/lib/data/observedAccounts';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { scopedProfileRows, participatesInFill } from '@/lib/data/profileMetrics';
import { profileClient, HISTORY_LIMIT, units, numberText } from './profileData';

/** Not a global profit ranking: only addresses actually connected in this browser. */
export function ObservedLeaderboard() {
  const [accounts, setAccounts] = useState(() => observedAccounts(localStorage));
  const [end] = useState(() => Math.floor(Date.now() / 1000));
  const queries = useQueries({
    queries: accounts.map((account) => ({
      queryKey: ['observed-volume', 50383, account, end - 604800, end],
      staleTime: 60000,
      retry: 1,
      queryFn: async () => {
        const fills = await profileClient.getUserFills(account, {
          since: end - 604800,
          until: end - 1,
          markets: ALL_VERIFIED_PERP_MARKETS.map((m) => m.poolAddress),
          limit: HISTORY_LIMIT,
        });
        const owned = scopedProfileRows(
          fills,
          account,
          end - 604800,
          end,
          ALL_VERIFIED_PERP_MARKETS.map((m) => m.poolAddress),
          participatesInFill
        );
        return {
          volume: units(owned.reduce((sum, fill) => sum + BigInt(fill.quoteQuantity), 0n)),
          capped: fills.length >= HISTORY_LIMIT,
        };
      },
    })),
  });

  const rows = accounts
    .map((account, i) => ({ account, query: queries[i] }))
    .sort((a, b) => (b.query.data?.volume ?? -1) - (a.query.data?.volume ?? -1));

  return (
    <section className="profile-leaderboard" aria-label="Observed-account leaderboard">
      <div className="leaderboard-header">
        <div className="leaderboard-title-group">
          <div className="leaderboard-icon-badge">
            <Trophy size={16} />
          </div>
          <div>
            <h2>Observed accounts · indexed volume</h2>
            <p>
              7D volume ranking of up to five wallets connected in this browser on Tokyo testnet.
              Ranked by verified indexed fill notional (not profit, ROI, or a global cohort).
            </p>
          </div>
        </div>
        {accounts.length > 0 && (
          <button
            className="button button-subtle-danger"
            onClick={() => {
              clearObservedAccounts(localStorage);
              setAccounts([]);
            }}
            title="Clear saved accounts"
          >
            <Trash2 size={13} className="btn-icon" />
            <span>Clear list</span>
          </button>
        )}
      </div>

      {!rows.length ? (
        <div className="leaderboard-empty">
          <p>No connected accounts observed in this browser yet. Zero demo traders or fabricated ranks.</p>
        </div>
      ) : (
        <div className="leaderboard-table">
          {rows.map(({ account, query }, index) => (
            <div key={account} className="leaderboard-row">
              <div className="leaderboard-rank">
                <span className={`rank-badge rank-${index + 1}`}>#{index + 1}</span>
              </div>
              <div className="leaderboard-wallet">
                <a href={`/app/profile/${account}`} className="leaderboard-address">
                  <span>{account}</span>
                  <ExternalLink size={11} className="wallet-link-icon" />
                </a>
              </div>
              <div className="leaderboard-metric">
                {query.isPending ? (
                  <span className="reading-tag">Reading…</span>
                ) : query.isError ? (
                  <span className="error-tag">Volume unavailable</span>
                ) : (
                  <div className="leaderboard-val">
                    <strong>{numberText(query.data?.volume)}</strong>
                    <span className="unit-tag">USDso</span>
                    {query.data?.capped && <span className="capped-pill">Capped</span>}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
