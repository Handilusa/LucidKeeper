import { useEffect, useState } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { Address } from 'viem';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import {
  Search,
  ExternalLink,
  Copy,
  Check,
  RotateCcw,
  Download,
  Shield,
  Activity,
  Layers,
  Info,
  Lock,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from 'lucide-react';
import { connectedAccount, accountSessionKey, accountStorageKey } from '@/lib/data/accountScope';
import { windowReturn, scopedProfileRows, ownsProfileRow, participatesInFill } from '@/lib/data/profileMetrics';
import { ObservedLeaderboard } from './ObservedLeaderboard';
import { AppHeader } from '@/features/terminal/AppHeader';
import { ConnectedCollateralFunds } from '@/features/margin/ConnectedCollateralFunds';
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

export default function Profile({ requestedAddress }: { requestedAddress?: string }) {
  const { address, isConnected, chainId } = useAccount();
  const { openConnectModal } = useConnectModal();
  const connected = connectedAccount(address, isConnected);
  const account = requestedAddress === undefined ? connected : connectedAccount(requestedAddress, true);
  const [lookup, setLookup] = useState('');
  const isOwner = !!account && account === connected;

  useEffect(() => {
    document.title = 'Portfolio | LucidKeeper';
  }, []);

  const handleLookupSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const valid = connectedAccount(lookup.trim(), true);
    if (valid) window.location.assign(`/app/profile/${valid}`);
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to portfolio
      </a>
      <AppHeader page="portfolio" />

      {connected && <ConnectedCollateralFunds key={accountSessionKey(connected, chainId)} account={connected} />}

      {account ? (
        <ProfileAccount
          key={`${accountSessionKey(account, chainId)}:${isOwner}`}
          account={account}
          chainId={chainId}
          isOwner={isOwner}
          lookup={lookup}
          setLookup={setLookup}
          onLookupSubmit={handleLookupSubmit}
        />
      ) : (
        /* Disconnected State / No Account Selected */
        <main className="content-page profile-page profile-disconnected-view" id="main" tabIndex={-1}>
          <div className="profile-hero-radar">
            <div className="radar-glow-ring" />
            <div className="radar-orbit-ring" />
            <div className="radar-center-icon">
              <Shield size={32} />
            </div>
          </div>

          <p className="eyebrow">LUCIDKEEPER PROTOCOL // PORTFOLIO SUITE</p>
          <h1>Portfolio</h1>

          <section className="profile-empty disconnected-hero-card" aria-label="Wallet connection required">
            <h2>{requestedAddress === undefined ? 'Connect your wallet to view your portfolio' : 'Invalid public address'}</h2>
            <p>
              {requestedAddress === undefined
                ? 'Institutional risk telemetry, real-time MarginBank solvency, and verifiable trade execution history on Somnia Tokyo testnet.'
                : 'Use a full 0x address with 40 hexadecimal characters. No account reads were started for this path.'}
            </p>
            {requestedAddress === undefined && (
              <button className="button button-primary hero-connect-btn" onClick={openConnectModal}>
                <Wallet size={16} className="btn-icon" />
                <span>Connect wallet</span>
              </button>
            )}
          </section>

          {/* Integrated Address Inspector Bar */}
          <div className="disconnected-lookup-section">
            <span className="lookup-divider-label">OR INSPECT ANY PUBLIC TOKYO ADDRESS</span>
            <form className="alias-form lookup-standalone-bar" aria-label="Look up a public portfolio" onSubmit={handleLookupSubmit}>
              <label htmlFor="profile-lookup" className="sr-only">
                Public address on Tokyo
              </label>
              <div className="search-input-wrapper">
                <Search size={15} className="search-icon" />
                <input
                  id="profile-lookup"
                  value={lookup}
                  onChange={(event) => setLookup(event.target.value)}
                  placeholder="0x… (40 hex characters)"
                  required
                  pattern="0x[0-9a-fA-F]{40}"
                  autoComplete="off"
                  spellCheck="false"
                />
              </div>
              <button className="button button-secondary" type="submit">
                <span>View public portfolio</span>
                <ArrowRight size={13} className="btn-icon-right" />
              </button>
            </form>
          </div>

          {/* Feature Showcase Grid */}
          <div className="disconnected-features-grid">
            <div className="feature-card">
              <div className="feature-icon-box">
                <Activity size={18} />
              </div>
              <h3>Real-Time Margin Telemetry</h3>
              <p>Direct RPC queries to Somnia MarginBank contracts for equity, maintenance requirements, and liquidation health factor.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <Layers size={18} />
              </div>
              <h3>Zero-Fabrication Ledger</h3>
              <p>All fills, position updates, settled funding, and margin transfers indexed losslessly with on-chain transaction hashes.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon-box">
                <Lock size={18} />
              </div>
              <h3>Client-Scoped Privacy</h3>
              <p>Local wallet aliases and observation caches stay strictly on your device. Zero external tracking or server storage.</p>
            </div>
          </div>

          <p className="profile-notice">On-chain activity is public. Wallet-scoped display is not on-chain privacy.</p>
          <div className="disconnected-actions">
            <a className="button" href="/app">
              Browse markets
            </a>
          </div>
        </main>
      )}
    </>
  );
}

function ProfileAccount({
  account,
  chainId,
  isOwner,
  lookup,
  setLookup,
  onLookupSubmit,
}: {
  account: Address;
  chainId?: number;
  isOwner: boolean;
  lookup: string;
  setLookup: (v: string) => void;
  onLookupSubmit: (e: React.FormEvent) => void;
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
  const [copied, setCopied] = useState(false);

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
  const pools = ALL_VERIFIED_PERP_MARKETS.map((market) => market.poolAddress);

  const changeRows = scopedProfileRows(
    changes.isError ? [] : changes.data || [],
    account,
    start,
    end,
    pools,
    ownsProfileRow
  );
  const fillRows = scopedProfileRows(
    fills.isError ? [] : fills.data || [],
    account,
    start,
    end,
    pools,
    participatesInFill
  );
  const orderRows = orders.isError
    ? []
    : (orders.data || []).filter((r) => inWindow(r.lastUpdatedAtTimestamp));
  const fundingRows = funding.isError
    ? []
    : scopedProfileRows(funding.data || [], account, start, end, pools, ownsProfileRow);
  const transferRows = transfers.isError
    ? []
    : scopedProfileRows(transfers.data || [], account, start, end, pools, ownsProfileRow).filter(
        (r) => ['Deposit', 'Withdraw', 'Credited'].includes(r.kind)
      );
  const feeRows = fees.isError
    ? []
    : scopedProfileRows(fees.data || [], account, start, end, pools, ownsProfileRow);

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
          feeRows.reduce(
            (sum, r) => sum + (r.isRebate ? -BigInt(r.amount) : BigInt(r.amount)),
            0n
          )
        )
      : null;

  const truncated = historyQueries.some((q) => q.data?.length === HISTORY_LIMIT);
  const anyError = historyQueries.some((q) => q.isError);

  // Current equity is not equity at either historical boundary. Never substitute it.
  const roi = windowReturn({
    start,
    end,
    startingValue: null,
    endingValue: null,
    cashFlows: [],
    completeCashFlows: false,
    verifiedBoundaryValues: false,
  });

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

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setMessage('Address copied to clipboard.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage('Copy unavailable. Select the address above to copy it manually.');
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

      const backdrop = ctx.createLinearGradient(0, 0, 1200, 630);
      backdrop.addColorStop(0, '#0c0b12');
      backdrop.addColorStop(1, '#151320');
      ctx.fillStyle = backdrop;
      ctx.fillRect(0, 0, 1200, 630);

      ctx.fillStyle = '#771be8';
      ctx.fillRect(0, 0, 10, 630);

      ctx.fillStyle = '#bc93f3';
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.fillText('LUCIDKEEPER // PORTFOLIO AUDIT', 60, 65);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px Syne, sans-serif';
      ctx.fillText(alias || 'Tokyo Portfolio', 60, 140);

      ctx.fillStyle = '#8d849f';
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText(account, 60, 185);

      [
        ['Account equity', units(live.margin.equity)],
        [`${windowKey} indexed price PnL`, realized],
        [`${windowKey} indexed volume`, volume],
      ].forEach(([lbl, val], idx) => {
        const x = 60 + idx * 370;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.fillRect(x, 245, 340, 150);

        ctx.strokeStyle = 'rgba(188, 147, 243, 0.15)';
        ctx.strokeRect(x, 245, 340, 150);

        ctx.fillStyle = '#8d849f';
        ctx.font = '14px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(String(lbl), x + 24, 285);

        ctx.fillStyle =
          idx === 1 && typeof val === 'number' && val !== 0
            ? val > 0
              ? '#60cf9f'
              : '#f4808b'
            : '#ffffff';
        ctx.font = '700 32px "JetBrains Mono", monospace';
        ctx.fillText(numberText(val as number | null), x + 24, 340);

        ctx.fillStyle = '#8d849f';
        ctx.font = '13px "JetBrains Mono", monospace';
        ctx.fillText('USDso', x + 24, 375);
      });

      ctx.fillStyle = '#bc93f3';
      ctx.font = '16px "JetBrains Mono", monospace';
      ctx.fillText('Testnet – no real funds · Somnia Tokyo 50383', 60, 465);

      ctx.fillStyle = '#8d849f';
      ctx.font = '15px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(
        `${isOwner ? 'Connected EOA' : 'Public Watch'} · Block ${live.margin.asOfBlock}`,
        60,
        500
      );
      ctx.fillText(
        `Observed ${utc(live.observedAt / 1000)} UTC · Window ends ${utc(end)} UTC`,
        60,
        530
      );
      ctx.fillText(
        'Bounded indexed history. Price PnL excludes fees/funding. Not execution proof.',
        60,
        565
      );

      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Image export failed'))),
          'image/png'
        )
      );
      downloadBlob(blob, 'LucidKeeper-portfolio.png');
      setMessage('Portfolio snapshot image downloaded.');
    } catch {
      setMessage('Image export failed. Retry in a modern browser with canvas support.');
    }
  };

  return (
    <main
      className="content-page profile-page profile-connected-view"
      id="main"
      tabIndex={-1}
      data-profile-ready={liveReady && historyReady}
    >
      {/* 1. Header Hub & Quick Actions */}
      <header className="profile-heading">
        <div className="profile-heading-title">
          <div className="profile-telemetry-badge">
            <span className="beacon-live" />
            <span className="telemetry-label">LUCIDKEEPER PROTOCOL // PORTFOLIO TELEMETRY</span>
          </div>
          <h1>Portfolio Command</h1>
        </div>

        <div className="profile-actions-hub">
          {/* Integrated Quick Search for Any Tokyo Address */}
          <form
            className="alias-form profile-quick-lookup"
            aria-label="Look up a public portfolio"
            onSubmit={onLookupSubmit}
          >
            <label htmlFor="profile-lookup" className="sr-only">
              Public address on Tokyo
            </label>
            <div className="search-pill-wrapper">
              <Search size={13} className="search-pill-icon" />
              <input
                id="profile-lookup"
                value={lookup}
                onChange={(e) => setLookup(e.target.value)}
                placeholder="Inspect Tokyo address…"
                pattern="0x[0-9a-fA-F]{40}"
                autoComplete="off"
                spellCheck="false"
              />
              <button type="submit" className="search-pill-submit" title="View portfolio">
                ↵
              </button>
            </div>
          </form>

          <button className="button profile-btn-action" onClick={fresh} title="Refresh all on-chain reads">
            <RotateCcw size={13} className="btn-icon" />
            <span>Refresh</span>
          </button>

          <button
            className="button button-primary profile-btn-action"
            disabled={!liveReady || !historyReady || anyError}
            onClick={() => void share()}
            title="Download shareable PNG card"
          >
            <Download size={13} className="btn-icon" />
            <span>Snapshot</span>
          </button>
        </div>
      </header>

      {/* Chain Alert if on wrong network */}
      {chainId !== undefined && chainId !== 50383 && (
        <div className="profile-network-alert" role="alert">
          <Info size={16} />
          <span>Your wallet is on another network. All portfolio metrics refer exclusively to Somnia Tokyo testnet (50383).</span>
        </div>
      )}

      {/* 2. Identity & Solvency Bento Hero */}
      <div className="profile-hero-bento">
        {/* Left: Account Identity & Local Alias */}
        <section className="profile-identity" aria-label="Profile identity">
          <div className="profile-avatar" aria-hidden="true">
            <div className="avatar-initials">{account.slice(2, 4).toUpperCase()}</div>
            <div className="avatar-pulse-ring" />
          </div>

          <div className="profile-account">
            <div className="profile-title-row">
              <h2>{alias || (isOwner ? 'Connected Account' : 'Public Watch Account')}</h2>
              <div className="profile-badges">
                <span className="badge-pill badge-scope">
                  {isOwner ? 'Connected EOA' : 'Public Watch'}
                </span>
                <span className="badge-pill badge-net">Tokyo 50383</span>
              </div>
            </div>

            <div className="profile-address-row">
              <a
                href={`${PROJECT.explorer}/address/${account}`}
                target="_blank"
                rel="noreferrer"
                className="profile-address numeric"
                title="View full address on Somnia Tokyo Explorer"
              >
                <span>{account}</span>
                <ExternalLink size={12} className="ext-icon" />
              </a>

              <button
                type="button"
                className="btn-copy-address"
                onClick={copyAddress}
                title="Copy address"
              >
                {copied ? <Check size={12} color="#60cf9f" /> : <Copy size={12} />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            {/* Seamless Local Alias Form */}
            <form className="alias-form profile-inline-alias" onSubmit={saveAlias}>
              <label htmlFor="profile-alias" className="alias-label">
                Local alias <small>(Stored locally in this browser)</small>
              </label>
              <div className="alias-input-group">
                <input
                  id="profile-alias"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={24}
                  placeholder="Set custom alias…"
                  aria-invalid={!!validation}
                  aria-describedby="alias-error"
                  autoComplete="off"
                />
                <button className="button button-alias-save" type="submit">
                  Save alias
                </button>
              </div>
              <p id="alias-error" className="alias-error">
                {validation}
              </p>
            </form>
          </div>
        </section>

        {/* Right: Solvency & Block Telemetry Anchor */}
        <div className="profile-solvency-card">
          <div className="solvency-header">
            <span className="solvency-title">MARGIN STATUS</span>
            <span className={`solvency-pill ${live?.margin?.marginStatus === 'Healthy' ? 'solvency-healthy' : 'solvency-warn'}`}>
              {live ? (live.margin.marginStatus === 'Healthy' ? 'HEALTHY // NOMINAL' : live.margin.marginStatus) : 'READING…'}
            </span>
          </div>

          <div className="solvency-equity-highlight">
            <span className="solvency-equity-label">Net Margin Equity</span>
            <div className="solvency-equity-val">
              {live ? (
                <AnimatedValue value={units(live.margin.equity)} digits={4} />
              ) : (
                '—'
              )}
              <span className="equity-unit">USDso</span>
            </div>
          </div>

          <div className="solvency-bar-container">
            <div className="solvency-bar-labels">
              <span>Maintenance Req</span>
              <span>{live ? `${numberText(units(live.margin.mmReq), 2)} USDso` : '—'}</span>
            </div>
            <div className="solvency-bar-track">
              <div
                className="solvency-bar-fill"
                style={{
                  width: live && units(live.margin.equity) > 0
                    ? `${Math.min(100, (units(live.margin.mmReq) / units(live.margin.equity)) * 100)}%`
                    : '0%',
                }}
              />
            </div>
          </div>

          <div className="solvency-block-meta">
            <span>Pinned block:</span>
            {live ? (
              <a
                href={`${PROJECT.explorer}/block/${live.margin.asOfBlock}`}
                target="_blank"
                rel="noreferrer"
                className="block-link"
              >
                #{live.margin.asOfBlock.toString()} ↗
              </a>
            ) : (
              <span>Reading…</span>
            )}
            <span className="block-time">· {live ? `${utc(live.observedAt / 1000)} UTC` : '—'}</span>
          </div>
        </div>
      </div>

      {/* Global Status Feedback Pill */}
      <p role="status" className="profile-feedback">
        {message && <span key={message}>{message}</span>}
      </p>

      {/* 3. Account Capital & Margin Metrics Grid (Account Now) */}
      <div className="profile-section-title">
        <div>
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

      {/* 4. Performance & Visual Analytics Studio */}
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
                type="button"
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

        {anyError && (
          <p role="status" className="profile-notice profile-error-notice">
            {[...new Set(historyQueries.filter((q) => q.isError).map((q) => q.error?.message))].join(
              ' · '
            )}
            . Endpoint protection may require a cooldown before Refresh reads succeeds.
          </p>
        )}

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
          <Metric
            label="Net fees"
            value={netFees}
            tone="cost"
            pending={fees.isPending}
            note="Charges minus rebates; no STT gas"
          />
          <Metric
            label="ROI"
            value={roi.value === null ? null : roi.value * 100}
            unit="%"
            note={roi.reason || 'PnL / max(100, starting value + max net deposits)'}
          />
          <Metric
            label="Win rate"
            value={null}
            unit=""
            note="Complete closed trade cycles not reconstructed"
          />
        </div>

        {/* Chart Panel */}
        <div className="profile-chart-panel">
          <div className="profile-chart-heading">
            <div className="chart-header-left">
              <h3>
                {chart === 'pnl'
                  ? 'Cumulative realized price PnL'
                  : chart === 'volume'
                    ? 'Daily filled volume'
                    : 'Historical equity'}
              </h3>
              <span className="chart-scope-pill">INDEXED TELEMETRY</span>
            </div>
            <div className="profile-segments" role="group" aria-label="Chart metric">
              {(['pnl', 'volume', 'equity'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={chart === key}
                  onClick={() => setChart(key)}
                >
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
              <button className="button button-primary" onClick={fresh}>
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

        {/* Methodology Accordion */}
        <details className="profile-methodology">
          <summary>How these metrics are calculated</summary>
          <div className="methodology-content">
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
              There is no verified global profit cohort. The browser-local observed-account leaderboard
              ranks indexed fill volume only. Badges describe read scope, not profitability or ownership.
            </p>
            <a
              href={`${PROJECT.github}/blob/main/docs/PORTFOLIO_DATA.md`}
              target="_blank"
              rel="noreferrer"
              className="methodology-link"
            >
              <span>Data methodology</span>
              <ExternalLink size={11} className="ext-icon" />
            </a>
          </div>
        </details>
      </section>

      {/* 5. Browser-Local Observed Leaderboard */}
      <ObservedLeaderboard />

      {/* 6. Trade Ledger (Tabbed Tables) */}
      <div className="profile-table-tabs" role="group" aria-label="Portfolio activity view">
        {(Object.keys(headers) as TableKey[]).map((name) => {
          const count = tableRows[name]?.length ?? 0;
          return (
            <button
              key={name}
              type="button"
              aria-pressed={table === name}
              onClick={() => setTable(name)}
              className="table-tab-btn"
            >
              <span>{name}</span>
              {count > 0 && <span className="tab-count-pill">{count}</span>}
            </button>
          );
        })}
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

      {/* 7. Footer Hub */}
      <footer className="profile-footer">
        <div className="footer-links">
          <a href="/app" className="button">
            Open terminal
          </a>
          <a href="/app/docs" className="button">
            Read the field guide
          </a>
        </div>
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
    <article
      className="profile-metric"
      aria-busy={pending}
      data-tone={tone && available && value !== 0 ? (positive ? 'positive' : 'negative') : undefined}
    >
      <div className="metric-header">
        <h3>{label}</h3>
        {tone === 'pnl' && available && value !== 0 && (
          <span className={`metric-trend-icon ${positive ? 'trend-up' : 'trend-down'}`}>
            {positive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          </span>
        )}
      </div>

      <p className="metric-value numeric">
        {pending ? (
          <span className="metric-pending">Reading…</span>
        ) : available ? (
          <AnimatedValue value={value} digits={4} flash={tone === 'pnl'} />
        ) : (
          '—'
        )}{' '}
        <small>{unit}</small>
      </p>

      <p className="metric-note">{note}</p>
    </article>
  );
}
