import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { connectedAccount, accountSessionKey, accountStorageKey } from '@/lib/data/accountScope';
import { AppHeader } from '@/features/terminal/AppHeader';
import { PROJECT } from '@/content/project';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { ProfileTable } from './ProfileTable';
import { ProfileChart } from './ProfileChart';
import { AnimatedValue } from '@/components/AnimatedValue';
import {
  aliasError,
  downloadBlob,
  HISTORY_LIMIT,
  marketFor,
  numberText,
  profileClient,
  readProfileSnapshot,
  units,
  utc,
  type ProfileRow,
} from './profileData';
import './profile.css';

const windows = { '24H': 86400, '7D': 604800, '30D': 2592000, ALL: null } as const;
type WindowKey = keyof typeof windows;
type TableKey =
  'Positions' | 'Fills' | 'Order history' | 'Position changes' | 'Funding' | 'Transfers';

export default function Profile() {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const account = connectedAccount(address, isConnected);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to portfolio
      </a>
      <AppHeader page="portfolio" />
      {account ? <ProfileAccount key={accountSessionKey(account, chainId)} account={account} chainId={chainId} /> : (
        <main className="content-page profile-page" id="main" tabIndex={-1}>
          <p className="eyebrow">YOUR ACTIVITY, WITH CONTEXT</p>
          <h1>Portfolio</h1>
          <section className="profile-empty" aria-label="Wallet connection required">
            <h2>Connect your wallet to view your portfolio</h2>
            <p>Positions, balances, history and exports belong to your connected address. No account is selected while disconnected.</p>
            <button className="button button-primary" onClick={openConnectModal}>Connect wallet</button>
          </section>
          <p className="profile-notice">On-chain activity is public. Wallet-scoped display is not on-chain privacy.</p>
          <a className="button" href="/app">Browse markets</a>
        </main>
      )}
    </>
  );
}

function ProfileAccount({
  account,
  chainId,
}: {
  account: Address;
  chainId?: number;
}) {
  const rpc = usePublicClient({ chainId: 50383 });
  const queryClient = useQueryClient();
  const [windowKey, setWindowKey] = useState<WindowKey>('7D');
  const [end, setEnd] = useState(() => Math.floor(Date.now() / 1000));
  const [now, setNow] = useState(Date.now);
  const [table, setTable] = useState<TableKey>('Positions');
  const [chart, setChart] = useState<'pnl' | 'volume' | 'equity'>('pnl');
  const storageKey = accountStorageKey('profile_alias', account)!;
  const [alias, setAlias] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey) || '';
      return aliasError(saved) ? '' : saved;
    } catch {
      return '';
    }
  });
  const [draft, setDraft] = useState(alias);
  const [message, setMessage] = useState('');
  const [validation, setValidation] = useState('');
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);
  const start = windows[windowKey] === null ? 0 : end - windows[windowKey];
  const options = { staleTime: 60000, retry: 1 } as const;
  const snapshot = useQuery({
    queryKey: ['profile', 50383, account, 'snapshot'],
    queryFn: () => {
      if (!rpc) throw new Error('Tokyo reader unavailable');
      return readProfileSnapshot(account, rpc);
    },
    enabled: !!rpc,
    refetchInterval: 15000,
    retry: 1,
  });
  const changes = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'changes', start, end],
    queryFn: () =>
      profileClient.listPerpPositionChanges({
        account,
        from: start,
        to: end,
        limit: HISTORY_LIMIT,
      }),
  });
  const fills = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'fills', start, end],
    queryFn: () =>
      profileClient.getUserFills(account, {
        since: start,
        until: end - 1,
        markets: ALL_VERIFIED_PERP_MARKETS.map((m) => m.poolAddress),
        limit: HISTORY_LIMIT,
      }),
  });
  const orders = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'orders'],
    queryFn: () => profileClient.listPerpOrderHistory(account, { limit: HISTORY_LIMIT }),
  });
  const transfers = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'transfers'],
    queryFn: () =>
      profileClient.getMarginEvents(account, {
        kinds: ['Deposit', 'Withdraw', 'Credited'],
        limit: HISTORY_LIMIT,
      }),
  });
  const funding = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'funding'],
    queryFn: () => profileClient.getFundingPayments(account, { limit: HISTORY_LIMIT }),
  });
  const fees = useQuery({
    ...options,
    queryKey: ['profile', 50383, account, 'fees'],
    queryFn: () => profileClient.listPerpFees({ account, limit: HISTORY_LIMIT }),
  });
  const liveReady = !!snapshot.data && !snapshot.isError && now - snapshot.dataUpdatedAt < 45000;
  const live = liveReady ? snapshot.data : undefined;
  const historyQueries = [changes, fills, orders, transfers, funding, fees];
  const historyReady = historyQueries.every((q) => !q.isPending);
  const inWindow = (time: string | bigint) => Number(time) >= start && Number(time) < end;
  const changeRows = changes.isError ? [] : changes.data || [];
  const fillRows = fills.isError ? [] : fills.data || [];
  const orderRows = orders.isError
    ? []
    : (orders.data || []).filter((r) => inWindow(r.lastUpdatedAtTimestamp));
  const fundingRows = funding.isError
    ? []
    : (funding.data || []).filter((r) => inWindow(r.timestamp));
  const transferRows = transfers.isError
    ? []
    : (transfers.data || []).filter((r) => inWindow(r.timestamp));
  const feeRows = fees.isError ? [] : (fees.data || []).filter((r) => inWindow(r.timestamp));
  const realized =
    changes.data && !changes.isError
      ? units(changeRows.reduce((sum, r) => sum + r.realizedPnl, 0n))
      : null;
  const volume =
    fills.data && !fills.isError
      ? units(fillRows.reduce((sum, r) => sum + BigInt(r.quoteQuantity), 0n))
      : null;
  const settledFunding =
    funding.data && !funding.isError
      ? units(fundingRows.reduce((sum, r) => sum + BigInt(r.amount), 0n))
      : null;
  const netFees =
    fees.data && !fees.isError
      ? units(
          feeRows.reduce((sum, r) => sum + (r.isRebate ? -BigInt(r.amount) : BigInt(r.amount)), 0n)
        )
      : null;
  const truncated = historyQueries.some((q) => q.data?.length === HISTORY_LIMIT);
  const anyError = historyQueries.some((q) => q.isError);
  const unitPrice = (value: bigint | string | null, pool: string, base = false) => {
    const market = marketFor(pool);
    return market && value !== null
      ? units(value, base ? market.baseDecimals : market.quoteDecimals)
      : null;
  };
  const symbol = (pool: string | null) =>
    pool ? marketFor(pool)?.baseSymbol || `${pool.slice(0, 8)}…` : 'Account';
  const fresh = () => {
    setEnd(Math.floor(Date.now() / 1000));
    setNow(Date.now());
    void queryClient.invalidateQueries({ queryKey: ['profile', 50383, account] });
  };
  let cumulative = 0n;
  const pnlPoints = [...changeRows]
    .sort((a, b) => Number(a.blockNumber - b.blockNumber) || a.logIndex - b.logIndex)
    .filter((r) => r.closedSize > 0n)
    .map((r) => {
      cumulative += r.realizedPnl;
      return { time: Number(r.timestamp), value: units(cumulative) };
    });
  const days = new Map<number, bigint>();
  for (const fill of fillRows) {
    const day = Math.floor(Number(fill.timestamp) / 86400) * 86400;
    days.set(day, (days.get(day) || 0n) + BigInt(fill.quoteQuantity));
  }
  const volumePoints = [...days]
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time: Math.max(start, time), value: units(value) }));
  const points = chart === 'pnl' ? pnlPoints : volumePoints;
  const chartStart = start || Math.min(end, ...points.map((p) => p.time));
  const tableRows: Record<TableKey, ProfileRow[]> = {
    Positions: (live?.positions || []).map((p) => ({
      id: p.id,
      time: live!.observedAt / 1000,
      cells: [p.symbol, p.size > 0 ? 'Long' : 'Short', Math.abs(p.size), p.entry, p.price, p.pnl],
    })),
    Fills: fillRows.map((r) => ({
      id: r.id,
      time: Number(r.timestamp),
      hash: r.txHash,
      cells: [
        utc(Number(r.timestamp)),
        symbol(r.pool),
        r.takerIsBid === null
          ? 'Unknown'
          : (r.taker?.toLowerCase() === account.toLowerCase() ? r.takerIsBid : !r.takerIsBid)
            ? 'Buy'
            : 'Sell',
        unitPrice(r.quantity, r.pool, true),
        unitPrice(r.fillPrice, r.pool),
        units(r.quoteQuantity),
      ],
    })),
    'Order history': orderRows.map((r) => ({
      id: r.id,
      time: Number(r.lastUpdatedAtTimestamp),
      hash: r.placedTxHash,
      cells: [
        utc(Number(r.lastUpdatedAtTimestamp)),
        symbol(r.market.poolAddress),
        r.isBid ? 'Buy' : 'Sell',
        r.status,
        unitPrice(r.fullQuantity, r.market.poolAddress, true),
        unitPrice(r.filledQuantity, r.market.poolAddress, true),
        r.cancelReason || '—',
      ],
    })),
    'Position changes': changeRows.map((r) => ({
      id: r.id,
      time: Number(r.timestamp),
      hash: r.txHash,
      cells: [
        utc(Number(r.timestamp)),
        symbol(r.pool),
        r.kind,
        unitPrice(r.closedSize, r.pool, true),
        units(r.realizedPnl),
        r.orderId?.toString() || 'No order',
      ],
    })),
    Funding: fundingRows.map((r) => ({
      id: r.id,
      time: Number(r.timestamp),
      hash: r.txHash,
      cells: [
        utc(Number(r.timestamp)),
        symbol(r.pool),
        BigInt(r.amount) > 0n ? 'Paid' : BigInt(r.amount) < 0n ? 'Received' : 'Zero settlement',
        Math.abs(units(r.amount)),
      ],
    })),
    Transfers: transferRows.map((r) => ({
      id: r.id,
      time: Number(r.timestamp),
      hash: r.txHash,
      cells: [utc(Number(r.timestamp)), r.kind, units(r.amount)],
    })),
  };
  const headers: Record<TableKey, string[]> = {
    Positions: [
      'Market',
      'Side',
      'Size (base)',
      'Entry (USDso)',
      'Mark (USDso)',
      'Price uPnL (USDso)',
    ],
    Fills: ['Time (UTC)', 'Market', 'Side', 'Size (base)', 'Price (USDso)', 'Notional (USDso)'],
    'Order history': [
      'Ended (UTC)',
      'Market',
      'Side',
      'Status',
      'Original (base)',
      'Filled (base)',
      'Cancel reason',
    ],
    'Position changes': [
      'Time (UTC)',
      'Market',
      'Change',
      'Closed size (base)',
      'Realized (USDso)',
      'Order ID',
    ],
    Funding: ['Time (UTC)', 'Market', 'Direction', 'Amount (USDso)'],
    Transfers: ['Time (UTC)', 'Movement', 'Amount (USDso)'],
  };
  const tableQuery = {
    Positions: snapshot,
    Fills: fills,
    'Order history': orders,
    'Position changes': changes,
    Funding: funding,
    Transfers: transfers,
  }[table];
  const saveAlias = (event: React.FormEvent) => {
    event.preventDefault();
    const value = draft.trim();
    const error = aliasError(value);
    setValidation(error);
    if (error) return;
    try {
      if (value) localStorage.setItem(storageKey, value);
      else localStorage.removeItem(storageKey);
      setAlias(value);
      setDraft(value);
      setMessage(value ? 'Local alias saved on this browser.' : 'Local alias removed.');
    } catch {
      setMessage('Browser storage is unavailable. Alias was not saved.');
    }
  };
  const share = async () => {
    if (!live) return;
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 630;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      const tokens = getComputedStyle(document.documentElement);
      const color = (name: string) => tokens.getPropertyValue(name).trim();
      const backdrop = ctx.createLinearGradient(0, 0, 1200, 630);
      backdrop.addColorStop(0, color('--bg-deep'));
      backdrop.addColorStop(1, color('--bg-panel'));
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, 1200, 630);
      ctx.fillStyle = color('--color-violet');
      ctx.fillRect(0, 0, 12, 630);
      ctx.fillStyle = color('--color-cyan');
      ctx.font = '22px "JetBrains Mono"';
      ctx.fillText('LUCIDKEEPER / PORTFOLIO SNAPSHOT', 60, 65);
      ctx.fillStyle = color('--text');
      ctx.font = 'bold 48px Syne';
      ctx.fillText(alias || 'Tokyo portfolio', 60, 150);
      ctx.fillStyle = color('--muted');
      ctx.font = '18px "JetBrains Mono"';
      ctx.fillText(account, 60, 194);
      [
        ['Account equity', units(live.margin.equity)],
        [`${windowKey} indexed price PnL`, realized],
        [`${windowKey} indexed volume`, volume],
      ].forEach(([label, value], index) => {
        const x = 60 + index * 375;
        ctx.fillStyle = color('--bg-surface');
        ctx.fillRect(x, 265, 345, 145);
        ctx.fillStyle = color('--muted');
        ctx.font = '17px "Plus Jakarta Sans"';
        ctx.fillText(String(label), x + 20, 300);
        ctx.fillStyle = color(index === 1 && typeof value === 'number' && value !== 0
          ? value > 0 ? '--color-emerald' : '--color-rose' : '--text');
        ctx.font = '30px "JetBrains Mono"';
        ctx.fillText(numberText(value as number | null), x + 20, 351);
        ctx.fillStyle = color('--muted');
        ctx.font = '14px "JetBrains Mono"';
        ctx.fillText('USDso', x + 20, 385);
      });
      ctx.fillStyle = color('--color-cyan');
      ctx.font = '18px "JetBrains Mono"';
      ctx.fillText('Testnet – no real funds · Tokyo 50383', 60, 465);
      ctx.fillStyle = color('--muted');
      ctx.font = '16px "Plus Jakarta Sans"';
      ctx.fillText(
        `Connected address · Block ${live.margin.asOfBlock}`,
        60,
        501
      );
      ctx.fillText(
        `Observed ${utc(live.observedAt / 1000)} UTC · History ends ${utc(end)} UTC`,
        60,
        533
      );
      ctx.fillText(
        'Bounded indexed history. Price PnL excludes fees/funding. Not ROI or execution proof.',
        60,
        570
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Image export failed'))),
          'image/png'
        )
      );
      downloadBlob(blob, 'LucidKeeper-portfolio.png');
      setMessage(
        'Portfolio image downloaded. Its values and observation time are shown on this page.'
      );
    } catch {
      setMessage('Image export failed. Retry in a browser with canvas support.');
    }
  };

  return (
    <main
      className="content-page profile-page"
      id="main"
      tabIndex={-1}
      data-profile-ready={liveReady && historyReady}
    >
      <header className="profile-heading">
        <div>
          <p className="eyebrow">YOUR ACTIVITY, WITH CONTEXT</p>
          <h1>Portfolio</h1>
        </div>
        <div className="profile-actions">
          <button className="button" onClick={fresh}>
            Refresh reads
          </button>
          <button
            className="button button-primary"
            disabled={!liveReady || !historyReady || anyError}
            onClick={() => void share()}
          >
            Download share image
          </button>
        </div>
      </header>
      <section className="profile-identity" aria-label="Profile identity">
        <div className="profile-avatar" aria-hidden="true">
          {account.slice(2, 4).toUpperCase()}
        </div>
        <div className="profile-account">
          <h2>{alias || 'Connected account'}</h2>
          <a
            href={`${PROJECT.explorer}/address/${account}`}
            target="_blank"
            rel="noreferrer"
            className="profile-address numeric"
          >
            {account} ↗
          </a>
          <div className="profile-badges">
            <span>Connected address</span>
            <span>Read-only portfolio</span>
            <span>Tokyo 50383</span>
          </div>
        </div>
        <button
          className="button"
          onClick={() => {
            void navigator.clipboard.writeText(account).then(
              () => setMessage('Address copied.'),
              () => setMessage('Copy unavailable. Select the address above to copy it manually.')
            );
          }}
        >
          Copy address
        </button>
      </section>
      {chainId !== 50383 && (
        <p className="profile-notice">
          Your wallet is on another network. Portfolio reads still refer exclusively to Somnia Tokyo
          50383.
        </p>
      )}
      <form className="alias-form" onSubmit={saveAlias}>
        <label htmlFor="profile-alias">
          Local alias <small>Only this browser. No on-chain identity or privacy.</small>
        </label>
        <input
          id="profile-alias"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          maxLength={24}
          placeholder="Add an alias"
          aria-invalid={!!validation}
          aria-describedby="alias-error"
          autoComplete="off"
        />
        <button className="button" type="submit">
          Save alias
        </button>
        <p id="alias-error" className="alias-error">
          {validation}
        </p>
      </form>
      <p role="status" className="profile-feedback">
        {message && <span key={message}>{message}</span>}
      </p>
      <div className="profile-section-title">
        <h2>Account now</h2>
        <p>
          {live ? (
            <>
              Pinned block{' '}
              <a
                href={`${PROJECT.explorer}/block/${live.margin.asOfBlock}`}
                target="_blank"
                rel="noreferrer"
              >
                {live.margin.asOfBlock.toString()} ↗
              </a>{' '}
              · {utc(live.observedAt / 1000)} UTC
            </>
          ) : snapshot.isPending ? (
            'Reading MarginBank…'
          ) : (
            'Account read unavailable / stale. Refresh reads to retry.'
          )}
        </p>
      </div>
      <div className="account-metrics">
        <Metric
          label="Account equity"
          pending={snapshot.isPending}
          value={live ? units(live.margin.equity) : null}
          note="MarginBank equity, not wallet balance"
        />
        <Metric
          label="Free collateral"
          pending={snapshot.isPending}
          value={live ? Math.max(0, units(live.margin.equity - live.margin.imReq)) : null}
          note="max(0, equity − initial requirement)"
        />
        <Metric
          label="Unlocked collateral"
          pending={snapshot.isPending}
          value={live ? units(live.margin.unlockedCollateralBalance) : null}
          note="Unreserved collateral; not free margin"
        />
        <Metric
          label="Maintenance required"
          pending={snapshot.isPending}
          value={live ? units(live.margin.mmReq) : null}
          note={live ? `Current health: ${live.margin.marginStatus}` : 'Health unavailable'}
        />
      </div>
      <section className="profile-history" aria-labelledby="history-title">
        <div className="profile-section-title">
          <div>
            <h2 id="history-title">Performance, with the source attached.</h2>
            <p>Historical window ends {utc(end)} UTC. Refresh to include new activity.</p>
          </div>
          <div className="profile-segments" role="group" aria-label="History time window">
            {(Object.keys(windows) as WindowKey[]).map((key) => (
              <button
                key={key}
                aria-pressed={key === windowKey}
                onClick={() => {
                  setWindowKey(key);
                  setEnd(Math.floor(Date.now() / 1000));
                }}
              >
                {key === 'ALL' ? 'All indexed' : key}
              </button>
            ))}
          </div>
        </div>
        <p className="profile-notice">
          {!historyReady
            ? 'Loading public history…'
            : anyError
              ? 'Some history reads failed. Affected metrics are unavailable; refresh to retry.'
              : truncated
                ? 'Row limit reached. Totals and charts cover returned rows only.'
                : 'Indexed observations, not a complete account-return audit.'}{' '}
          Up to {HISTORY_LIMIT.toLocaleString()} newest rows per source. Indexer lag or missing
          events can affect coverage.
        </p>
        <div className="history-metrics">
          <Metric
            label="Realized price PnL"
            tone="pnl"
            pending={changes.isPending}
            value={realized}
            note="Sum of indexed position updates; excludes fees/funding"
          />
          <Metric
            label="Filled volume"
            pending={fills.isPending}
            value={volume}
            note="Sum of indexed quote notional; not deposits"
          />
          <Metric
            label="Settled funding"
            tone="cost"
            pending={funding.isPending}
            value={settledFunding}
            note="Positive = paid; negative = received"
          />
          <Metric label="Net fees" value={netFees} tone="cost" pending={fees.isPending} note="Charges minus rebates; no STT gas" />
          <Metric
            label="ROI"
            value={null}
            unit=""
            note="Starting equity and full net-deposit coverage unavailable"
          />
          <Metric
            label="Win rate"
            value={null}
            unit=""
            note="Complete closed trade cycles not reconstructed"
          />
        </div>
        <div className="profile-chart-panel">
          <div className="profile-chart-heading">
            <h3>
              {chart === 'pnl'
                ? 'Cumulative realized price PnL'
                : chart === 'volume'
                  ? 'Daily filled volume'
                  : 'Historical equity'}
            </h3>
            <div className="profile-segments" role="group" aria-label="Chart metric">
              {(['pnl', 'volume', 'equity'] as const).map((key) => (
                <button key={key} aria-pressed={chart === key} onClick={() => setChart(key)}>
                  {key === 'pnl' ? 'Price PnL' : key === 'volume' ? 'Volume' : 'Equity'}
                </button>
              ))}
            </div>
          </div>
          {chart === 'equity' ? (
            <div className="profile-empty chart-empty">
              <h3>Historical equity is not available</h3>
              <p>
                Current account state cannot reconstruct past mark prices or pending funding. No
                invented equity curve is shown.
              </p>
            </div>
          ) : (chart === 'pnl' ? changes : fills).isPending ? (
            <div className="profile-empty chart-empty" role="status">
              <span className="loading-track" aria-hidden="true" />
              Loading chart observations…
            </div>
          ) : (chart === 'pnl' ? changes : fills).isError ? (
            <div className="profile-empty chart-empty">
              <h3>Chart source unavailable</h3>
              <button className="button" onClick={fresh}>
                Retry chart reads
              </button>
            </div>
          ) : (
            <ProfileChart key={chart} points={points} mode={chart} start={chartStart} end={end} />
          )}
          <p className="chart-footnote">
            USDso ·{' '}
            {chart === 'pnl'
              ? 'Starts at the first returned realizing update. Steps sum only observed price PnL; no interpolation or net-return claim.'
              : 'Bars show observed daily quote notional. Missing days have no bar; no synthetic activity.'}
          </p>
        </div>
        <details className="profile-methodology">
          <summary>How these metrics are calculated</summary>
          <p>
            Requested ROI: <code>PnL / max(100, starting account value + max net deposits)</code>{' '}
            for the selected window (×100 to display percent). Max net deposits means the maximum
            cumulative net inflow within that window. Starting equity, complete cash flows and total
            window PnL are not verified here, so ROI is unavailable. This is the requested formula,
            not a verified Hyperliquid attribution.
          </p>
          <p>
            Price PnL is the sum of PerpPositionChange.realizedPnl. One order may produce several
            updates. Funding is separate and positive when paid. Fees subtract rebates. Fill volume
            uses quoteQuantity, not a rounded price × size. Current position uPnL excludes pending
            funding. All amounts are USDso unless a base-token size is named.
          </p>
          <p>
            No leaderboard is shown because there is no verified cohort or comparable full-return
            dataset. Badges describe read scope, not profitability, rank or ownership.
          </p>
          <a
            href={`${PROJECT.github}/blob/main/docs/PORTFOLIO_DATA.md`}
            target="_blank"
            rel="noreferrer"
          >
            Data methodology ↗
          </a>
        </details>
      </section>
      <div className="profile-table-tabs" role="group" aria-label="Portfolio activity view">
        {(Object.keys(headers) as TableKey[]).map((name) => (
          <button key={name} aria-pressed={table === name} onClick={() => setTable(name)}>
            {name}
          </button>
        ))}
      </div>
      <ProfileTable
        key={`${table}-${windowKey}`}
        name={table}
        account={account}
        headers={headers[table]}
        rows={tableRows[table]}
        pending={tableQuery.isPending}
        failed={table === 'Positions' ? !snapshot.isPending && !liveReady : tableQuery.isError}
        onRetry={fresh}
      />
      <p className="profile-source-note">
        Positions are current pinned RPC reads; other tables use the selected historical window.
        Order history lists ended orders and links their placement transaction; status is not a new
        fill verification. All records describe the displayed address, irrespective of which
        interface submitted them.
      </p>
      <footer className="profile-footer">
        <a href="/app" className="button">
          Open terminal
        </a>
        <a href="/app/docs" className="button">
          Read the field guide
        </a>
        <p>Testnet – no real funds. Aliases are local. On-chain activity is public.</p>
      </footer>
    </main>
  );
}

function Metric({
  label,
  value,
  note,
  unit = 'USDso',
  tone,
  pending = false,
}: {
  label: string;
  value: number | null;
  note: string;
  unit?: string;
  tone?: 'pnl' | 'cost';
  pending?: boolean;
}) {
  const available = value !== null && Number.isFinite(value);
  const positive = available && (tone === 'cost' ? value < 0 : value > 0);
  return (
    <article className="profile-metric" aria-busy={pending} data-tone={tone && available && value !== 0 ? positive ? 'positive' : 'negative' : undefined}>
      <h3>{label}</h3>
      <p className="metric-value numeric">
        {pending ? <span className="metric-pending">Reading…</span> : available ? <AnimatedValue value={value} digits={4} flash={tone === 'pnl'} /> : '—'} <small>{unit}</small>
      </p>
      <p className="metric-note">{note}</p>
    </article>
  );
}
