import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Share2, RefreshCw, XCircle } from 'lucide-react';
import { perpPoolAbi } from '@/chain/abis';
import { formatDynamicPrice, quantizeToGrid } from '@/lib/math/format';
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

export interface PositionItem {
  id: string;
  marketSymbol: string;
  poolAddress: string;
  isLong: boolean;
  size: number;
  entryPrice: number;
  markPrice: number;
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
  onOpenCardModal: (pos: PositionItem) => void;
  onPositionClosed?: () => void;
  onSelectMarket?: (marketSymbol: string) => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  markPrice,
  account,
  onOpenCardModal,
  onPositionClosed,
  onSelectMarket,
}) => {
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

  // Trade History State
  const [historyItems, setHistoryItems] = useState<TradeHistoryItem[]>(() =>
    getTradeHistory(account || '')
  );
  const [historyLoading, setHistoryLoading] = useState<boolean>(false);
  const [historyPage, setHistoryPage] = useState<number>(0);
  const PAGE_SIZE = 20;

  // Active Orders State
  const [activeOrders, setActiveOrders] = useState<ActiveOrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);

  // Partial Close modal state
  const [partialClosePos, setPartialClosePos] = useState<PositionItem | null>(null);
  const [partialClosePercent, setPartialClosePercent] = useState<number>(100);

  const activeAccount = account || '';

  // 1. Load Real Trade History from Indexer with Viem Fallback
  const loadHistory = useCallback(async () => {
    if (!activeAccount) {
      setHistoryItems([]);
      return;
    }
    setHistoryLoading(true);
    try {
      const items = await fetchUserTradeHistory(activeAccount, PAGE_SIZE, historyPage * PAGE_SIZE);
      if (items && items.length > 0) {
        setHistoryItems(items);
      } else if (publicClient) {
        // Fallback to on-chain RPC logs if indexer returned empty or is lagging
        const rpcItems = await fetchRpcTradeHistoryFallback(publicClient, activeAccount);
        if (rpcItems.length > 0) {
          setHistoryItems(rpcItems);
        } else {
          setHistoryItems(getTradeHistory(activeAccount));
        }
      }
    } catch (err) {
      console.warn('[TradeHistory] Error loading history:', err);
      if (publicClient) {
        const rpcItems = await fetchRpcTradeHistoryFallback(publicClient, activeAccount);
        setHistoryItems(rpcItems.length > 0 ? rpcItems : getTradeHistory(activeAccount));
      }
    } finally {
      setHistoryLoading(false);
    }
  }, [activeAccount, historyPage, publicClient]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 2. Load Real Active Orders from Indexer
  const loadActiveOrders = useCallback(async () => {
    if (!activeAccount) {
      setActiveOrders([]);
      return;
    }
    setOrdersLoading(true);
    try {
      const orders = await fetchUserActiveOrders(activeAccount);
      setActiveOrders(orders);
    } catch (err) {
      console.warn('[ActiveOrders] Error loading orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (activeTab === 'orders') {
      loadActiveOrders();
    }
  }, [activeTab, loadActiveOrders]);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const notifiedHashRef = useRef<string | null>(null);
  const lastClosedPosRef = useRef<{ pos: PositionItem; percent: number } | null>(null);

  useEffect(() => {
    if (isConfirmed && hash && notifiedHashRef.current !== hash) {
      notifiedHashRef.current = hash;
      if (lastClosedPosRef.current && activeAccount) {
        const { pos, percent } = lastClosedPosRef.current;
        const closedSize = (pos.size * percent) / 100;
        saveTradeHistoryItem(activeAccount, {
          id: `close-${hash}`,
          hash,
          type: 'close',
          marketSymbol: pos.marketSymbol,
          side: pos.isLong ? 'sell' : 'buy',
          size: closedSize,
          timestamp: Date.now(),
          description: `Closed ${percent}% of ${pos.marketSymbol}-PERP position (${closedSize} ${pos.marketSymbol}) via IOC`,
        });
        loadHistory();
      }
      toast.success('Transaction confirmed and settled on Somnia Tokyo!', {
        id: `tx-settled-${hash}`,
        description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      onPositionClosed?.();
      setPartialClosePos(null);
    }
  }, [isConfirmed, hash, onPositionClosed, activeAccount, loadHistory]);

  // Partial or Full Close Position Execution
  const executeClosePosition = async (pos: PositionItem, percent: number = 100) => {
    try {
      lastClosedPosRef.current = { pos, percent };
      const actionName = pos.isLong ? 'Sell IOC' : 'Buy IOC';
      toast.info(
        `Submitting Close (${percent}% exit via ${actionName}) for ${pos.marketSymbol}-PERP...`
      );

      const effectiveMarkPrice =
        pos.markPrice > 0 ? pos.markPrice : markPrice > 0 ? markPrice : pos.entryPrice || 1;
      const baseMarkPrice = parseUnits(
        effectiveMarkPrice.toFixed(pos.quoteDecimals && pos.quoteDecimals > 6 ? 6 : 2),
        pos.quoteDecimals || 18
      );
      const slippagePrice = pos.isLong
        ? (baseMarkPrice * 98n) / 100n
        : (baseMarkPrice * 102n) / 100n;

      const marketMeta = ALL_VERIFIED_PERP_MARKETS.find(
        (m) => m.poolAddress.toLowerCase() === pos.poolAddress.toLowerCase()
      );
      const tickSize = marketMeta?.tickSize
        ? parseUnits(marketMeta.tickSize, pos.quoteDecimals || 18)
        : parseUnits('0.00001', pos.quoteDecimals || 18);
      const lotSize = marketMeta?.lotSize
        ? parseUnits(marketMeta.lotSize, pos.baseDecimals || 8)
        : parseUnits('0.00001', pos.baseDecimals || 8);

      const rawPrice = quantizeToGrid(slippagePrice, tickSize, 'floor');
      const rawFullQuantity = parseUnits(pos.size.toString(), pos.baseDecimals || 8);
      let targetExitQuantity =
        percent === 100 ? rawFullQuantity : (rawFullQuantity * BigInt(percent)) / 100n;
      targetExitQuantity = quantizeToGrid(targetExitQuantity, lotSize, 'floor');

      if (targetExitQuantity <= 0n) {
        toast.error(`Position size is too small to split ${percent}%. Close 100% instead.`);
        return;
      }

      const expiry = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;

      await writeContractAsync({
        chainId: 50383,
        address: pos.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [
          !pos.isLong,
          0n,
          rawPrice,
          targetExitQuantity,
          expiry,
          2, // IOC
          0, // CANCEL_NEWEST
          zeroAddress,
          0n,
        ],
        gas: 5_000_000n,
      });

      toast.success(`Close order (${percent}%) submitted! Awaiting Tokyo confirmation...`);
    } catch (err: unknown) {
      console.error('Close error:', err);
      const e = err as { shortMessage?: string; message?: string };
      toast.error(`Failed to close ${pos.marketSymbol} position`, {
        description: e?.shortMessage || e?.message || 'Transaction reverted',
      });
    }
  };

  // Cancel Limit Order Execution
  const handleCancelOrder = async (order: ActiveOrderItem) => {
    try {
      toast.info(`Cancelling resting order #${order.orderId.slice(0, 10)}... on Somnia Tokyo...`);
      await writeContractAsync({
        chainId: 50383,
        address: order.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'cancelOrder',
        args: [BigInt(order.orderId)],
        gas: 3_000_000n,
      });
      toast.success(`Cancellation transaction submitted for order #${order.orderId}!`);
      setTimeout(loadActiveOrders, 3000);
    } catch (err: unknown) {
      console.error('Cancel order error:', err);
      const e = err as { shortMessage?: string; message?: string };
      toast.error('Failed to cancel resting order', {
        description: e?.shortMessage || e?.message || 'Transaction reverted',
      });
    }
  };

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center justify-between px-5 pt-4 border-b border-[#1a2536] bg-[#070a0e]/50">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setActiveTab('positions')}
            className={`pb-3 text-xs font-mono font-bold transition-colors relative flex items-center space-x-2 ${
              activeTab === 'positions' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Open Positions ({positions.length})</span>
            <span
              className="px-1.5 py-0.5 rounded text-[9px] bg-[#1a2536] text-cyan-300 font-normal border border-cyan-500/30"
              title="dreamDEX opera en modelo Netting: una única posición consolidada por mercado con tamaño acumulado y precio ponderado"
            >
              Netting
            </span>
            {activeTab === 'positions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`pb-3 text-xs font-mono font-bold transition-colors relative flex items-center space-x-1.5 ${
              activeTab === 'orders' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Active Orders ({activeOrders.length})</span>
            {activeTab === 'orders' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
            )}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-xs font-mono font-bold transition-colors relative flex items-center space-x-1.5 ${
              activeTab === 'history' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Trade History ({historyItems.length})</span>
            {activeTab === 'history' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
            )}
          </button>
        </div>

        {/* Refresh button */}
        <button
          onClick={() => {
            if (activeTab === 'history') loadHistory();
            if (activeTab === 'orders') loadActiveOrders();
          }}
          title="Refresh table data"
          className="pb-3 text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${historyLoading || ordersLoading ? 'animate-spin text-cyan-400' : ''}`} />
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 overflow-x-auto">
        {/* Open Positions Tab */}
        {activeTab === 'positions' &&
          (positions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No open positions. Use the terminal above to execute an on-chain trade on Somnia Tokyo.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-[#1a2536] text-[10px] pb-2">
                  <th scope="col" className="pb-2">MARKET / SIDE</th>
                  <th scope="col" className="pb-2">SIZE</th>
                  <th scope="col" className="pb-2">ENTRY PRICE</th>
                  <th scope="col" className="pb-2">MARK PRICE</th>
                  <th scope="col" className="pb-2">EST. LIQ PRICE</th>
                  <th scope="col" className="pb-2">MARGIN</th>
                  <th scope="col" className="pb-2">UNREALIZED PNL</th>
                  <th scope="col" className="pb-2 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2536]/60">
                {positions.map((pos) => {
                  const entry = pos.entryPrice > 0 ? pos.entryPrice : pos.markPrice;
                  const current =
                    pos.markPrice > 0 ? pos.markPrice : markPrice > 0 ? markPrice : entry;
                  const margin =
                    pos.margin > 0
                      ? pos.margin
                      : pos.leverage && pos.leverage > 0
                      ? (pos.size * (entry || current)) / pos.leverage
                      : pos.size * (entry || current);

                  const pnl =
                    entry > 0 && current > 0
                      ? pos.isLong
                        ? (current - entry) * pos.size
                        : (entry - current) * pos.size
                      : 0;
                  const pnlPercent = margin > 0 ? (pnl / margin) * 100 : 0;
                  const isProfit = pnl >= 0;
                  const estLiq = entry > 0 ? (pos.isLong ? entry * 0.82 : entry * 1.18) : 0;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 font-bold text-white flex items-center space-x-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] border ${
                            pos.isLong
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {pos.isLong ? 'LONG' : 'SHORT'} {pos.leverage ? `${pos.leverage}x` : '5x'}
                        </span>
                        <button
                          onClick={() => onSelectMarket?.(pos.marketSymbol)}
                          className="hover:text-cyan-400 hover:underline cursor-pointer flex items-center space-x-1"
                          title={`Switch terminal to ${pos.marketSymbol}`}
                        >
                          <span>{pos.marketSymbol}-PERP</span>
                        </button>
                      </td>
                      <td className="py-3 text-slate-200">
                        {pos.size} {pos.marketSymbol}
                      </td>
                      <td className="py-3 text-slate-300">
                        {entry > 0 ? `$${formatDynamicPrice(entry)}` : '--'}
                      </td>
                      <td className="py-3 text-slate-300 font-bold tabular-nums">
                        {current > 0 ? `$${formatDynamicPrice(current)}` : '--'}
                      </td>
                      <td className="py-3 text-rose-400">
                        {estLiq > 0 ? `~$${formatDynamicPrice(estLiq)}` : '--'}
                      </td>
                      <td className="py-3 text-cyan-400">
                        {margin > 0 ? `$${margin.toFixed(2)} USDso` : '--'}
                      </td>
                      <td
                        className={`py-3 font-bold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {margin > 0
                          ? `${isProfit ? '+' : ''}$${pnl.toFixed(4)} (${isProfit ? '+' : ''}${pnlPercent.toFixed(2)}%)`
                          : '--'}
                      </td>
                      <td className="py-3 text-right space-x-2">
                        <button
                          onClick={() => onOpenCardModal(pos)}
                          className="px-2 py-1 rounded bg-[#1a2536] hover:bg-slate-700 text-cyan-400 text-[11px] inline-flex items-center space-x-1"
                          title="Generate Viral PnL Card for X"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>Card</span>
                        </button>

                        {/* Partial Close Selector */}
                        <button
                          onClick={() => setPartialClosePos(pos)}
                          className="px-2 py-1 rounded bg-[#1a2536] hover:bg-slate-700 text-amber-300 text-[11px] font-semibold border border-amber-500/30"
                          title="Choose partial close percentage (25%, 50%, 75%, 100%)"
                        >
                          Partial
                        </button>

                        <button
                          disabled={isPending || isConfirming}
                          onClick={() => executeClosePosition(pos, 100)}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 border border-rose-500 text-rose-300 hover:text-white text-[11px] font-bold transition-all disabled:opacity-50"
                        >
                          {isPending || isConfirming ? 'Closing...' : 'Close (100%)'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {/* Active Orders Tab */}
        {activeTab === 'orders' &&
          (ordersLoading ? (
            <div className="py-8 text-center text-xs font-mono text-cyan-400 flex items-center justify-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
              <span>Loading resting orders from Somnia Tokyo orderbook...</span>
            </div>
          ) : activeOrders.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No resting limit orders on Somnia Tokyo book. Limit orders placed away from mark price will appear here.
            </div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-[#1a2536] text-[10px] pb-2">
                  <th scope="col" className="pb-2">ORDER ID</th>
                  <th scope="col" className="pb-2">MARKET</th>
                  <th scope="col" className="pb-2">SIDE</th>
                  <th scope="col" className="pb-2">LIMIT PRICE</th>
                  <th scope="col" className="pb-2">REMAINING / FULL</th>
                  <th scope="col" className="pb-2">PLACED</th>
                  <th scope="col" className="pb-2 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2536]/60">
                {activeOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="py-3 text-slate-300 font-bold">
                      #{ord.orderId.slice(0, 8)}...
                    </td>
                    <td className="py-3 text-white font-bold">{ord.marketSymbol}-PERP</td>
                    <td className="py-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ord.isBid
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {ord.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 text-slate-200 tabular-nums">
                      ${formatDynamicPrice(ord.price)}
                    </td>
                    <td className="py-3 text-slate-300 tabular-nums">
                      {ord.quantityRemaining} / {ord.fullQuantity} {ord.marketSymbol}
                    </td>
                    <td className="py-3 text-slate-400 text-[11px]">
                      {new Date(ord.placedAtTimestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 text-right">
                      <button
                        disabled={isPending || isConfirming}
                        onClick={() => handleCancelOrder(ord)}
                        className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-600 border border-rose-500 text-rose-300 hover:text-white text-[11px] font-bold transition-all disabled:opacity-50 inline-flex items-center space-x-1"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Cancel</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}

        {/* Trade History Tab (GraphQL Indexer + RPC Fallback) */}
        {activeTab === 'history' && (
          <div className="space-y-3 font-mono text-xs">
            {historyLoading ? (
              <div className="py-8 text-center text-xs font-mono text-cyan-400 flex items-center justify-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Querying on-chain history from dreamDEX Indexer...</span>
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No recorded transactions on Somnia Tokyo for this account yet. Executed trades, fills, and margin operations will appear here.
              </div>
            ) : (
              <>
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536] flex items-center justify-between hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <div className="font-bold text-white flex items-center space-x-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{item.description}</span>
                        {item.source === 'rpc_fallback' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            RPC Direct
                          </span>
                        )}
                        {item.source === 'indexer' && (
                          <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                            Indexed
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.blockNumber ? `Block ${item.blockNumber} · ` : ''}
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <a
                      href={`https://explorer.testnet.somnia.network/tokyo/tx/${item.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline flex items-center space-x-1 shrink-0 ml-4 font-mono text-xs"
                      title="Inspect transaction on Somnia Tokyo Explorer"
                    >
                      <span>{`${item.hash.slice(0, 8)}...${item.hash.slice(-6)}`}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}

                {/* Pagination Controls */}
                <div className="flex items-center justify-between pt-3 border-t border-[#1a2536] text-[11px] text-slate-400">
                  <button
                    disabled={historyPage === 0 || historyLoading}
                    onClick={() => setHistoryPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-[#070a0e] border border-[#1a2536] hover:border-cyan-500 disabled:opacity-40"
                  >
                    ← Previous Page
                  </button>
                  <span>Page {historyPage + 1}</span>
                  <button
                    disabled={historyItems.length < PAGE_SIZE || historyLoading}
                    onClick={() => setHistoryPage((p) => p + 1)}
                    className="px-3 py-1 rounded bg-[#070a0e] border border-[#1a2536] hover:border-cyan-500 disabled:opacity-40"
                  >
                    Next Page →
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Partial Close Modal */}
      {partialClosePos && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0d131d] border border-[#1a2536] rounded-2xl max-w-sm w-full p-5 space-y-4 glow-cyan shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1a2536] pb-2">
              <h4 className="font-display font-bold text-white text-sm">
                Partial Close: {partialClosePos.marketSymbol}-PERP
              </h4>
              <button
                onClick={() => setPartialClosePos(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="text-xs font-mono text-slate-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Total Position Size:</span>
                <span className="text-white font-bold">
                  {partialClosePos.size} {partialClosePos.marketSymbol}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Exit Size ({partialClosePercent}%):</span>
                <span className="text-cyan-400 font-bold">
                  {((partialClosePos.size * partialClosePercent) / 100).toFixed(5)}{' '}
                  {partialClosePos.marketSymbol}
                </span>
              </div>
            </div>

            {/* Quick Percentage Presets */}
            <div className="grid grid-cols-4 gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setPartialClosePercent(pct)}
                  className={`py-1.5 rounded text-xs font-mono font-bold transition-all ${
                    partialClosePercent === pct
                      ? 'bg-cyan-500 text-black shadow-md glow-cyan'
                      : 'bg-[#070a0e] border border-[#1a2536] text-slate-300 hover:border-cyan-500'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            <button
              disabled={isPending || isConfirming}
              onClick={() => executeClosePosition(partialClosePos, partialClosePercent)}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-display font-bold text-xs transition-all shadow-md disabled:opacity-50"
            >
              {isPending || isConfirming
                ? 'Submitting Close...'
                : `Confirm ${partialClosePercent}% Close (${partialClosePos.isLong ? 'Sell' : 'Buy'} IOC)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
