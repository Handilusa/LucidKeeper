import React, { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { toast } from 'sonner';
import { ExternalLink, Share2 } from 'lucide-react';
import { perpPoolAbi } from '@/chain/abis';

export interface PositionItem {
  id: string;
  marketSymbol: string;
  poolAddress: string;
  isLong: boolean;
  size: number;
  entryPrice: number;
  markPrice: number;
  margin: number;
  openTxHash: string;
}

interface PositionsTableProps {
  positions: PositionItem[];
  markPrice: number;
  onOpenCardModal: (pos: PositionItem) => void;
  onPositionClosed?: () => void;
}

export const PositionsTable: React.FC<PositionsTableProps> = ({
  positions,
  markPrice,
  onOpenCardModal,
  onPositionClosed,
}) => {
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (isConfirmed && hash) {
      toast.success('Position closed and settled in MarginBank!', {
        description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      onPositionClosed?.();
    }
  }, [isConfirmed, hash, onPositionClosed]);

  const handleClosePosition = async (pos: PositionItem) => {
    try {
      toast.info('Submitting Close Position (Sell IOC) order to Somnia Tokyo...');

      // Close Long by executing an IOC Sell
      const rawPrice = parseUnits((markPrice * 0.98).toFixed(1), 18); // Slippage tolerance for IOC
      const rawQuantity = parseUnits(pos.size.toString(), 8);
      const expiry = BigInt(Math.floor(Date.now() / 1000) + 300) * 1_000_000_000n;

      await writeContractAsync({
        address: pos.poolAddress as `0x${string}`,
        abi: perpPoolAbi,
        functionName: 'placeOrder',
        args: [
          !pos.isLong, // Opposite direction: false for sell
          0n,
          rawPrice,
          rawQuantity,
          expiry,
          2, // IOC Order
          0,
          zeroAddress,
          0n,
        ],
      });

      toast.success('Close order submitted! Confirming...');
    } catch (err: any) {
      console.error('Close error:', err);
      toast.error('Failed to close position', {
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
          className={`pb-3 text-xs font-mono font-bold transition-colors relative ${
            activeTab === 'positions' ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          <span>Open Positions ({positions.length})</span>
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
          <span>Trade History (3 Verified)</span>
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
                  const pnl = (markPrice - pos.entryPrice) * pos.size;
                  const pnlPercent =
                    ((markPrice - pos.entryPrice) / pos.entryPrice) *
                    100 *
                    ((pos.size * markPrice) / pos.margin);
                  const isProfit = pnl >= 0;

                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3 font-bold text-white flex items-center space-x-2">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] border border-emerald-500/30">
                          {pos.isLong ? 'LONG 5.2x' : 'SHORT'}
                        </span>
                        <span>{pos.marketSymbol}-PERP</span>
                      </td>
                      <td className="py-3 text-slate-200">{pos.size} BTC</td>
                      <td className="py-3 text-slate-300">
                        ${pos.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 text-slate-300 font-bold tabular-nums">
                        ${markPrice.toLocaleString('en-US', { minimumFractionDigits: 1 })}
                      </td>
                      <td className="py-3 text-rose-400">~$65,400.0</td>
                      <td className="py-3 text-cyan-400">${pos.margin.toFixed(2)} USDso</td>
                      <td
                        className={`py-3 font-bold tabular-nums ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}
                      >
                        {isProfit ? '+' : ''}${pnl.toFixed(4)} ({isProfit ? '+' : ''}
                        {pnlPercent.toFixed(2)}%)
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
                          {isPending || isConfirming ? 'Closing...' : 'Close (Sell IOC)'}
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
            {/* Tx 1 */}
            <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536] flex items-center justify-between">
              <div>
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="text-emerald-400">✓</span>
                  <span>OrderPlaced & OrderFilled (0.00013 BTC @ 79,946.0 USDso)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Block 34044423 · Taker ID: 8061227160211082042424
                </div>
              </div>
              <a
                href="https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <span>0x8e5f...a47a</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Tx 2 */}
            <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536] flex items-center justify-between">
              <div>
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="text-emerald-400">✓</span>
                  <span>Margin Deposit (2.0 USDso into MarginBank)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Block 34042291 · MarginBank: 0x4787...1394
                </div>
              </div>
              <a
                href="https://explorer.testnet.somnia.network/tokyo/tx/0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <span>0xce32...399a</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Tx 3 */}
            <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536] flex items-center justify-between">
              <div>
                <div className="font-bold text-white flex items-center space-x-2">
                  <span className="text-emerald-400">✓</span>
                  <span>ERC-20 Approve (2.0 USDso Collateral)</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Block 34042277 · Allowance auto-reset confirmed
                </div>
              </div>
              <a
                href="https://explorer.testnet.somnia.network/tokyo/tx/0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 hover:underline flex items-center space-x-1"
              >
                <span>0x5034...9a17</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
