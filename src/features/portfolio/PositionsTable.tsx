import React, { useState, useEffect, useRef } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Share2 } from 'lucide-react';
import { perpPoolAbi } from '@/chain/abis';
import { formatDynamicPrice, quantizeToGrid } from '@/lib/math/format';
import { ALL_VERIFIED_PERP_MARKETS } from '@/lib/data/markets';
import { getTradeHistory, saveTradeHistoryItem, type TradeHistoryItem } from '@/lib/data/tradeHistory';

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
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [historyItems, setHistoryItems] = useState<TradeHistoryItem[]>(() =>
    getTradeHistory(account || '0x1420cf8bb9d92c3fdb674ecc5a57295c59078fda')
  );

  const activeAccount = account || '0x1420cf8bb9d92c3fdb674ecc5a57295c59078fda';

  useEffect(() => {
    setHistoryItems(getTradeHistory(activeAccount));
  }, [activeAccount]);

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  const notifiedHashRef = useRef<string | null>(null);
  const lastClosedPosRef = useRef<PositionItem | null>(null);

  useEffect(() => {
    if (isConfirmed && hash && notifiedHashRef.current !== hash) {
      notifiedHashRef.current = hash;
      if (lastClosedPosRef.current) {
        const closed = lastClosedPosRef.current;
        saveTradeHistoryItem(activeAccount, {
          id: `close-${hash}`,
          hash,
          type: 'close',
          marketSymbol: closed.marketSymbol,
          side: closed.isLong ? 'sell' : 'buy',
          size: closed.size,
          timestamp: Date.now(),
          description: `Closed ${closed.marketSymbol}-PERP position via IOC`,
        });
        setHistoryItems(getTradeHistory(activeAccount));
      }
      toast.success('Position closed and settled in MarginBank!', {
        id: `close-settled-${hash}`,
        description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      onPositionClosed?.();
    }
  }, [isConfirmed, hash, onPositionClosed, activeAccount]);

  const handleClosePosition = async (pos: PositionItem) => {
    try {
      lastClosedPosRef.current = pos;
      const actionName = pos.isLong ? 'Sell IOC' : 'Buy IOC';
      toast.info(`Submitting Close Position (${actionName}) order for ${pos.marketSymbol}-PERP to Somnia Tokyo...`);

      // For closing a Long: SELL IOC with 2% floor slippage below mark
      // For closing a Short: BUY IOC with 2% ceiling slippage above mark
      const effectiveMarkPrice = pos.markPrice > 0 ? pos.markPrice : (markPrice > 0 ? markPrice : (pos.entryPrice || 1));
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
      const rawQuantity = quantizeToGrid(
        parseUnits(pos.size.toString(), pos.baseDecimals || 8),
        lotSize,
        'floor'
      );
      // Fresh expiry: 10 minutes from now, in nanoseconds
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 600) * 1_000_000_000n;

      await writeContractAsync({
        chainId: 50383,
        address: pos.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [
          !pos.isLong, // Opposite direction: false = sell to close long, true = buy to close short
          0n, // userData (uint64)
          rawPrice, // price (uint256)
          rawQuantity, // quantity (uint256)
          expiry, // expireTimestampNs (uint64)
          2, // IOC Order type (uint8)
          0, // selfMatchingOption: CANCEL_NEWEST (uint8)
          zeroAddress, // builder
          0n, // builderFeeBpsTimes1k (uint96)
        ],
        gas: 5_000_000n, // Explicit gas limit: guarantees OKX wallet displays network fee immediately
      });

      toast.success(`Close order for ${pos.marketSymbol} submitted! Confirming...`);
    } catch (err: any) {
      console.error('Close error:', err);
      toast.error(`Failed to close ${pos.marketSymbol} position`, {
        description: err?.shortMessage || err?.message || 'Transaction reverted',
      });
    }
  };

  return (
    <div className="bg-[#0d131d] border border-[#1a2536] rounded-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center space-x-4 px-5 pt-4 border-b border-[#1a2536] bg-[#070a0e]/50">
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
          className={`pb-3 text-xs font-mono font-bold transition-colors relative ${
            activeTab === 'orders' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Active Orders (0)</span>
          {activeTab === 'orders' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`pb-3 text-xs font-mono font-bold transition-colors relative ${
            activeTab === 'history' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Trade History ({historyItems.length})</span>
          {activeTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
          )}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="p-4 overflow-x-auto">
        {activeTab === 'positions' &&
          (positions.length === 0 ? (
            <div className="py-8 text-center text-xs font-mono text-slate-500">
              No open positions. Use the terminal above to execute an on-chain trade.
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
                  const current = pos.markPrice > 0 ? pos.markPrice : (markPrice > 0 ? markPrice : entry);
                  const margin = pos.margin > 0 ? pos.margin : (pos.leverage && pos.leverage > 0 ? (pos.size * (entry || current)) / pos.leverage : pos.size * (entry || current));

                  const pnl = entry > 0 && current > 0
                    ? (pos.isLong ? (current - entry) * pos.size : (entry - current) * pos.size)
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
                      <td className="py-3 text-slate-200">{pos.size} {pos.marketSymbol}</td>
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

                        <button
                          disabled={isPending || isConfirming}
                          onClick={() => handleClosePosition(pos)}
                          className="px-2.5 py-1 rounded bg-rose-500/20 hover:bg-rose-500 border border-rose-500 text-rose-300 hover:text-white text-[11px] font-bold transition-all"
                        >
                          {isPending || isConfirming
                            ? 'Closing...'
                            : `Close (${pos.isLong ? 'Sell' : 'Buy'} IOC)`}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ))}

        {activeTab === 'orders' && (
          <div className="py-8 text-center text-xs font-mono text-slate-500">
            No resting limit orders on Somnia Tokyo book.
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3 font-mono text-xs">
            {historyItems.length === 0 ? (
              <div className="py-8 text-center text-xs font-mono text-slate-500">
                No recorded transactions for this account yet. Executed trades and margin operations on Somnia Tokyo will appear here.
              </div>
            ) : (
              historyItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536] flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-white flex items-center space-x-2">
                      <span className="text-emerald-400">✓</span>
                      <span>{item.description}</span>
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
                    className="text-cyan-400 hover:underline flex items-center space-x-1 shrink-0 ml-4"
                  >
                    <span>{`${item.hash.slice(0, 8)}...${item.hash.slice(-6)}`}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
