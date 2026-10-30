import { useState, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import * as Tabs from '@radix-ui/react-tabs';
import { formatUnits, zeroAddress } from 'viem';
import { toast } from 'sonner';
import { RefreshCw, ChartNoAxesCombined, ListOrdered, History } from 'lucide-react';
import { CONTRACT_ADDRESSES, marginBankAbi, perpPoolAbi } from '@/chain/abis';
import { formatDynamicPrice } from '@/lib/math/format';
import { iocPrice } from '@/lib/math/ioc';
import { closeQuantity, positionByPool } from '@/lib/math/close';
import { assertOnchainActionAllowed } from '@/lib/operating-policy.mjs';
import { reviewBrowserWrite } from '@/lib/browser-policy';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import {
  fetchUserTradeHistory,
  fetchUserActiveOrders,
  type ActiveOrderItem,
  type TradeHistoryItem,
} from '@/lib/data/indexer';
import {
  getTradeHistory,
  saveTradeHistoryItem,
  fetchRpcTradeHistoryFallback,
} from '@/lib/data/tradeHistory';
import { Modal } from '@/components/Modal';
import { TokenLogo } from '@/components/TokenLogo';
import { LoadingState } from '@/components/LoadingState';

export interface PositionItem {
  id: string;
  marketSymbol: string;
  poolAddress: string;
  isLong: boolean;
  size: number;
  sizeRaw: bigint;
  entryPrice: number;
  markPrice: number;
  markPriceRaw: bigint | null;
  liquidationPrice?: number | null;
  readBlock?: string;
  maintenanceMarginBps?: number;
  margin: number;
  leverage?: number;
  openTxHash: string;
  baseDecimals?: number;
  quoteDecimals?: number;
}
interface PositionsTableProps {
  positions: PositionItem[];
  markPrice: number;
  account?: string;
  canManage: boolean;
  loading: boolean;
  error: boolean;
  onOpenCardModal: (pos: PositionItem) => void;
  onPositionClosed?: () => void;
  onSelectMarket?: (symbol: string) => void;
}
const explorer = 'https://explorer.testnet.somnia.network/tokyo/tx/';

export function PositionsTable({
  positions,
  account = '',
  canManage,
  loading,
  error,
  onOpenCardModal,
  onPositionClosed,
  onSelectMarket,
}: PositionsTableProps) {
  const publicClient = usePublicClient({ chainId: 50383 });
  const [activeTab, setActiveTab] = useState('positions');
  const [page, setPage] = useState(0);
  const [closePool, setClosePool] = useState<string | null>(null);
  const closePosition = !error && !loading ? positionByPool(positions, closePool) : null;
  const [preparing, setPreparing] = useState(false);
  const closeLock = useRef(false);
  const [percent, setPercent] = useState(100);
  const history = useQuery({
    queryKey: ['tradeHistory', account, page],
    enabled: activeTab === 'history' && !!account,
    queryFn: async () => {
      let failed = false;
      let items: TradeHistoryItem[] | undefined;
      try {
        items = await fetchUserTradeHistory(account, 20, page * 20);
      } catch {
        failed = true;
      }
      if (items?.length) return { items, limited: items.some((item) => item.source === 'cache') };
      if (page > 0) {
        if (failed) throw new Error('History unavailable');
        return { items: [], limited: false };
      }
      const rpc = publicClient ? await fetchRpcTradeHistoryFallback(publicClient, account) : [];
      const cached = getTradeHistory(account).map((item) => ({
        ...item,
        source: 'cache' as const,
      }));
      const fallback = rpc.length ? rpc : cached;
      if (!fallback.length && failed) throw new Error('History unavailable');
      return { items: fallback, limited: fallback.length > 0 };
    },
  });
  const orders = useQuery({
    queryKey: ['activeOrders', account],
    queryFn: () => fetchUserActiveOrders(account),
    enabled: activeTab === 'orders' && !!account,
    refetchInterval: 15000,
  });
  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const receipt = useWaitForTransactionReceipt({ hash });
  const busy = preparing || isPending || receipt.isLoading;
  const notified = useRef<string | null>(null);
  const lastClose = useRef<{ pos: PositionItem; percent: number; quantity: number } | null>(null);
  useEffect(() => {
    if (receipt.data?.status !== 'success' || !hash || notified.current === hash) return;
    notified.current = hash;
    if (lastClose.current) {
      const { pos, percent: value, quantity } = lastClose.current;
      saveTradeHistoryItem(account, {
        id: `close-${hash}`,
        hash,
        type: 'close',
        marketSymbol: pos.marketSymbol,
        side: pos.isLong ? 'sell' : 'buy',
        size: quantity,
        timestamp: Date.now(),
        description: `Close order transaction confirmed · requested ${value}% of ${pos.marketSymbol}; actual fill pending verification`,
      });
    }
    toast.success('Transaction confirmed', {
      description: 'Refreshing positions and indexed orders to verify the outcome.',
    });
    void history.refetch();
    void orders.refetch();
    onPositionClosed?.();
    setClosePool(null);
  }, [receipt.data, hash, account, onPositionClosed, history.refetch, orders.refetch]);

  async function executeClose(pos: PositionItem, value: number) {
    if (!canManage || busy || closeLock.current || !publicClient || pos.markPrice <= 0) return;
    closeLock.current = true;
    setPreparing(true);
    try {
      assertOnchainActionAllowed('order', { chainId: 50383, wallet: account });
      const market = ALL_VERIFIED_PERP_MARKETS.find(
        (m) => m.poolAddress.toLowerCase() === pos.poolAddress.toLowerCase()
      );
      if (!market) throw new Error('Market parameters unavailable');
      const blockNumber = await publicClient.getBlockNumber({ cacheTime: 0 });
      const [current, mark, grid] = await Promise.all([
        publicClient.readContract({ address: CONTRACT_ADDRESSES.MARGIN_BANK, abi: marginBankAbi, functionName: 'getPosition', args: [account as `0x${string}`, pos.poolAddress as `0x${string}`], blockNumber }),
        publicClient.readContract({ address: pos.poolAddress as `0x${string}`, abi: perpPoolAbi, functionName: 'tryGetMarkPrice', blockNumber }),
        publicClient.readContract({ address: pos.poolAddress as `0x${string}`, abi: perpPoolAbi, functionName: 'getOrderBookParameters', blockNumber }),
      ]);
      if (!mark[0]) throw new Error('Current mark unavailable');
      const rawQuantity = closeQuantity(pos.sizeRaw, current.size, value, grid.lotSize);
      const rawPrice = iocPrice(mark[1], grid.tickSize, current.size < 0n);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 300) * 1_000_000_000n;
      const request = {
        chainId: 50383,
        address: pos.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [current.size < 0n, 0n, rawPrice, rawQuantity, expiry, 2, 0, zeroAddress, 0n],
        gas: 5_000_000n,
      } as const;
      const reviewed = await reviewBrowserWrite(publicClient, request, 'order', account as `0x${string}`, { market: `${pos.marketSymbol}-PERP`, size: formatUnits(rawQuantity, market.baseDecimals), description: `Request ${value}% position reduction with opposite-side IOC; fill is not guaranteed.` });
      // Wallet review can take time: recheck position after approval and stop on change.
      const finalPosition = await publicClient.readContract({ address: CONTRACT_ADDRESSES.MARGIN_BANK, abi: marginBankAbi, functionName: 'getPosition', args: [account as `0x${string}`, pos.poolAddress as `0x${string}`] });
      closeQuantity(current.size, finalPosition.size, value, grid.lotSize);
      assertOnchainActionAllowed('order', { chainId: 50383, wallet: account });
      lastClose.current = { pos, percent: value, quantity: Number(formatUnits(rawQuantity, market.baseDecimals)) };
      await writeContractAsync({ ...request, ...reviewed });
      toast.info('Close order submitted · awaiting confirmation');
    } catch (e) {
      toast.error('Close order rejected or failed', {
        description: (e as { shortMessage?: string }).shortMessage || (e as Error).message,
      });
      onPositionClosed?.();
    } finally {
      closeLock.current = false;
      setPreparing(false);
    }
  }
  async function cancelOrder(order: ActiveOrderItem) {
    if (!canManage || busy) return;
    lastClose.current = null;
    try {
      assertOnchainActionAllowed('cancel', { chainId: 50383, wallet: account });
      throw new Error(`Cancellation #${order.orderId} requires a separately approved runtime allowlist change`);
    } catch (e) {
      toast.error('Cancellation rejected or failed', {
        description: (e as { shortMessage?: string }).shortMessage || (e as Error).message,
      });
    }
  }
  const refresh = () => {
    if (activeTab === 'positions') onPositionClosed?.();
    else if (activeTab === 'orders') void orders.refetch();
    else void history.refetch();
  };

  return (
    <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
      <div className="activity-tabs">
        <Tabs.List className="tab-list" aria-label="Account activity">
          <Tabs.Trigger value="positions">
            Positions {!loading && !error ? `(${positions.length})` : ''}
          </Tabs.Trigger>
          <Tabs.Trigger value="orders">Open orders</Tabs.Trigger>
          <Tabs.Trigger value="history">Trade history</Tabs.Trigger>
        </Tabs.List>
        <button className="icon-button" aria-label="Refresh activity" onClick={refresh}>
          <RefreshCw size={14} aria-hidden="true" />
        </button>
      </div>
      <Tabs.Content value="positions">
        {error ? (
          <div className="empty-state" role="status">
            <strong>Positions unavailable</strong>
            <span>Account reads failed or became stale. Refresh to try again.</span>
          </div>
        ) : loading ? (
          <div className="empty-state" role="status">
            <LoadingState label="Reading on-chain positions…" onRetry={refresh} />
          </div>
        ) : !positions.length ? (
          <div className="empty-state">
            <ChartNoAxesCombined size={26} className="brand-text" aria-hidden="true" />
            <strong>No open positions</strong>
            <span>Size an order to preview margin and liquidation. Filled positions appear here.</span>
          </div>
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Open positions, scroll horizontally for actions"
          >
            <table className="trading-table">
              <thead>
                <tr>
                  <th scope="col">Market / side</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Entry / mark</th>
                  <th scope="col">Unrealized PnL</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const pnl =
                    pos.markPrice > 0
                      ? (pos.markPrice - pos.entryPrice) * pos.size * (pos.isLong ? 1 : -1)
                      : null;
                  return (
                    <tr key={pos.id}>
                      <td>
                        <button
                          className="market-cell font-semibold"
                          onClick={() => onSelectMarket?.(pos.marketSymbol)}
                        >
                          <TokenLogo symbol={pos.marketSymbol} />{pos.marketSymbol}-PERP
                        </button>
                        <div className={`mt-1 ${pos.isLong ? 'positive' : 'negative'}`}>
                          {pos.isLong ? 'Long' : 'Short'} <span className="muted">· Cross</span>
                        </div>
                      </td>
                      <td>
                        {pos.size}
                        <div className="muted mt-1">{pos.marketSymbol}</div>
                      </td>
                      <td>
                        {formatDynamicPrice(pos.entryPrice)}
                        <div className="muted mt-1">
                          {pos.markPrice > 0 ? formatDynamicPrice(pos.markPrice) : 'Unavailable'}
                        </div>
                      </td>
                      <td className={pnl == null ? 'muted' : pnl >= 0 ? 'positive' : 'negative'}>
                        {pnl == null ? '—' : `${pnl >= 0 ? '+' : '−'}${Math.abs(pnl).toFixed(4)}`}
                        <div className="muted mt-1">USDso</div>
                      </td>
                      <td>
                        <div className="flex justify-end gap-1">
                          <button
                            className="button"
                            onClick={() => onOpenCardModal(pos)}
                            aria-label={`Share ${pos.marketSymbol} position`}
                          >
                            Share
                          </button>
                          <button
                            className="button"
                            disabled={!canManage || busy || pos.markPrice <= 0}
                            onClick={() => {
                              setPercent(50);
                              setClosePool(pos.poolAddress);
                            }}
                          >
                            Partial
                          </button>
                          <button
                            className="button text-rose-400"
                            disabled={!canManage || busy || pos.markPrice <= 0}
                            onClick={() => void executeClose(pos, 100)}
                          >
                            Close
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="form-note mb-3">
              Cross-margin account · entry and portfolio liquidation estimates appear on the selected market’s chart. Other markets are held constant; collateral is shared.
            </p>
          </div>
        )}
      </Tabs.Content>
      <Tabs.Content value="orders">
        {orders.isPending ? (
          <div className="empty-state" role="status">
            <LoadingState label="Loading indexed orders…" onRetry={refresh} />
          </div>
        ) : orders.isError ? (
          <div className="empty-state" role="status">
            <strong>Open orders unavailable</strong>
            <span>The indexer could not be reached. Refresh to retry.</span>
          </div>
        ) : !orders.data?.length ? (
          <div className="empty-state">
            <ListOrdered size={26} className="brand-text" aria-hidden="true" />
            <strong>No resting orders</strong>
            <span>Unfilled limit orders appear here while active.</span>
          </div>
        ) : (
          <div
            className="table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Open orders, horizontally scrollable"
          >
            <table className="trading-table">
              <thead>
                <tr>
                  <th scope="col">Market / side</th>
                  <th scope="col">Limit price</th>
                  <th scope="col">Remaining / full</th>
                  <th scope="col">Order</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.data.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="market-cell"><TokenLogo symbol={order.marketSymbol} />{order.marketSymbol}-PERP</span>
                      <div className={order.isBid ? 'positive' : 'negative'}>
                        {order.isBid ? 'Buy' : 'Sell'}
                      </div>
                    </td>
                    <td>{formatDynamicPrice(order.price)}</td>
                    <td>
                      {order.quantityRemaining} / {order.fullQuantity}
                    </td>
                    <td>
                      <a
                        className="text-cyan-400"
                        href={`${explorer}${order.placedTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`View ${order.marketSymbol} order ${order.orderId} transaction ${order.placedTxHash} in explorer (opens in a new tab)`}
                      >
                        #{order.orderId.slice(0, 8)}… ↗
                      </a>
                    </td>
                    <td>
                      <button
                        className="button text-rose-400"
                        disabled
                        title="Cancellation is outside the runtime bounty allowlist"
                        onClick={() => void cancelOrder(order)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tabs.Content>
      <Tabs.Content value="history">
        {history.isPending ? (
          <div className="empty-state" role="status">
            <LoadingState label="Loading execution history…" onRetry={refresh} />
          </div>
        ) : history.isError ? (
          <div className="empty-state" role="status">
            <strong>History unavailable</strong>
            <span>Refresh to retry the indexer and RPC.</span>
          </div>
        ) : !history.data?.items.length ? (
          <div className="empty-state">
            <History size={26} className="brand-text" aria-hidden="true" />
            <strong>No history in this query window</strong>
            <span>Indexed fills and collateral transactions appear here.</span>
          </div>
        ) : (
          <div className="px-4 pb-3">
            {history.data.limited && (
              <p className="form-note caution">
                Limited RPC / cached history. Records may be incomplete or stale.
              </p>
            )}
            {history.data.items.map((item) => (
              <div className="history-row" key={item.id}>
                <div>
                  <p className="market-cell">
                    {item.marketSymbol && <TokenLogo symbol={item.marketSymbol} size={18} />}
                    {item.source === 'cache'
                      ? `Cached ${item.type} record · ${item.marketSymbol || 'USDso'}`
                      : item.description}
                  </p>
                  <span className="muted">
                    {item.source === 'indexer'
                      ? 'Indexed'
                      : item.source === 'rpc_fallback'
                        ? 'RPC log · observed'
                        : 'Cached · observed'}{' '}
                    · <time dateTime={new Date(item.timestamp).toISOString()}>{new Date(item.timestamp).toISOString().replace('T', ' ').slice(0, 19)} UTC</time>{' '}
                    {item.blockNumber ? `· Block ${item.blockNumber}` : ''}
                  </span>
                </div>
                <a
                  href={`${explorer}${item.hash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="numeric"
                  aria-label={`View ${item.source === 'cache' ? `cached ${item.type}` : item.description} transaction ${item.hash} in explorer (opens in a new tab)`}
                >
                  {item.hash.slice(0, 8)}…{item.hash.slice(-4)} ↗
                </a>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3" role="group" aria-label="History pages">
          <button className="button" disabled={!page} onClick={() => setPage((value) => value - 1)}>
            Previous
          </button>
          <span className="eyebrow">Page {page + 1}</span>
          <button
            className="button"
            disabled={
              history.isFetching ||
              history.isError ||
              !history.data ||
              history.data.limited ||
              history.data.items.length < 20
            }
            onClick={() => setPage((value) => value + 1)}
          >
            Next
          </button>
        </div>
      </Tabs.Content>
      {hash && (
        <div className="transaction-status px-4 pb-3" role="status">
          {receipt.data?.status === 'reverted'
            ? 'Transaction reverted'
            : receipt.data?.status === 'success'
              ? 'Confirmed · check updated execution outcome'
              : receipt.isError
                ? 'Receipt unavailable'
                : 'Submitted · awaiting confirmation'}{' '}
          ·{' '}
          <a href={`${explorer}${hash}`} target="_blank" rel="noreferrer">
            View transaction ↗
          </a>
        </div>
      )}
      <Modal
        open={!!closePool}
        onClose={() => setClosePool(null)}
        title={`Partial close · ${closePosition?.marketSymbol || ''}-PERP`}
        description="An opposite-side IOC requests this reduction. No protocol reduce-only flag: concurrent trades can change the position after preflight. Unfilled quantity is cancelled."
      >
        {!closePosition ? <p role="status">Position unavailable or closed. Refresh and review again; no close can be submitted.</p> : (
          <>
            <dl>
              <div className="summary-row">
                <dt>Position quantity</dt>
                <dd>
                  {closePosition.size} {closePosition.marketSymbol}
                </dd>
              </div>
              <div className="summary-row">
                <dt>Requested reduction</dt>
                <dd>{percent}%</dd>
              </div>
            </dl>
            <div className="preset-row mb-5">
              {[25, 50, 75, 100].map((value) => (
                <button
                  key={value}
                  aria-pressed={percent === value}
                  onClick={() => setPercent(value)}
                >
                  {value}%
                </button>
              ))}
            </div>
            <button
              className="button button-primary w-full"
              disabled={!canManage || busy}
              onClick={() => void executeClose(closePosition, percent)}
            >
              {busy ? 'Awaiting wallet / receipt…' : `Submit ${percent}% close order`}
            </button>
          </>
        )}
      </Modal>
    </Tabs.Root>
  );
}
