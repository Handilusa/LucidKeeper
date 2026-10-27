import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { X, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';

interface MarginHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedMargin: number;
}

export const MarginHubModal: React.FC<MarginHubModalProps> = ({
  isOpen,
  onClose,
  unlockedMargin,
}) => {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('2.0');

  // Read wallet USDso balance
  const { data: walletBalanceRaw, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const walletUsdso = walletBalanceRaw ? parseFloat(formatUnits(walletBalanceRaw, 18)) : 198.0;

  const { data: hash, isPending, writeContractAsync } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  React.useEffect(() => {
    if (isConfirmed && hash) {
      toast.success('Margin transaction confirmed on Somnia Tokyo!', {
        description: `Tx: ${hash.slice(0, 10)}...${hash.slice(-8)}`,
      });
      refetchBalance();
    }
  }, [isConfirmed, hash, refetchBalance]);

  if (!isOpen) return null;

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet first');
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, 18);
      toast.info('Step 1/2: Approving exact USDso collateral...');

      // Approve exact amount
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
        abi: erc20Abi,
        functionName: 'approve',
        args: [CONTRACT_ADDRESSES.MARGIN_BANK, parsedAmount],
      });

      toast.info('Step 2/2: Depositing USDso into MarginBank...');
      await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        abi: marginBankAbi,
        functionName: 'deposit',
        args: [parsedAmount],
      });

      toast.success('Deposit submitted! Confirming...');
    } catch (err: any) {
      console.error('Deposit error:', err);
      toast.error('Deposit failed', {
        description: err?.shortMessage || err?.message || 'Transaction reverted',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet first');
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, 18);
      toast.info('Withdrawing collateral from MarginBank to wallet...');

      await writeContractAsync({
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        abi: marginBankAbi,
        functionName: 'withdraw',
        args: [parsedAmount],
      });

      toast.success('Withdraw submitted! Confirming...');
    } catch (err: any) {
      console.error('Withdraw error:', err);
      toast.error('Withdraw failed', {
        description: err?.shortMessage || err?.message || 'Transaction reverted',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-[#0d131d] border border-[#1a2536] rounded-2xl max-w-md w-full p-6 space-y-5 glow-cyan shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#1a2536] pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-lg text-white">MarginBank Collateral Hub</h3>
          </div>
          <button onClick={onClose} aria-label="Close Margin Hub" className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Overview Cards */}
        <div className="grid grid-cols-2 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536]">
            <span className="text-slate-400 text-[10px]">WALLET BALANCE</span>
            <div className="text-white font-bold text-base mt-1">
              {walletUsdso.toFixed(2)} USDso
            </div>
            <span className="text-[10px] text-slate-500">ERC-20 Token</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536]">
            <span className="text-slate-400 text-[10px]">UNLOCKED MARGIN</span>
            <div className="text-cyan-400 font-bold text-base mt-1">
              {unlockedMargin.toFixed(2)} USDso
            </div>
            <span className="text-[10px] text-slate-500">MarginBank Deposited</span>
          </div>
        </div>

        {/* Deposit / Withdraw Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#070a0e] border border-[#1a2536]">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`py-2 rounded-md font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'deposit'
                ? 'bg-cyan-500 text-black shadow-md glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Deposit Margin</span>
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`py-2 rounded-md font-display font-bold text-xs transition-all flex items-center justify-center space-x-1 ${
              activeTab === 'withdraw'
                ? 'bg-cyan-500 text-black shadow-md glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Withdraw Margin</span>
          </button>
        </div>

        {/* Amount Input */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span>Amount</span>
            <span>
              Available:{' '}
              {activeTab === 'deposit'
                ? `${walletUsdso.toFixed(2)} USDso`
                : `${unlockedMargin.toFixed(2)} USDso`}
            </span>
          </div>
          <div className="relative">
            <input
              type="number"
              step="0.1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Collateral amount in USDso"
              className="w-full px-3 py-2 pr-16 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500"
            />
            <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 font-bold">
              USDso
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-slate-400 font-mono space-y-1">
          <div className="text-cyan-400 font-bold flex items-center space-x-1">
            <span>🛡️ LucidKeeper Security Policy</span>
          </div>
          <p>
            Approvals grant exact amounts only. Allowance is verified and reset back to 0
            immediately after execution to protect your wallet from unauthorized auto-pulls.
          </p>
        </div>

        {/* Action Button */}
        <button
          disabled={isPending || isConfirming || parseFloat(amount) <= 0}
          onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-amber-500 hover:from-cyan-500 hover:to-amber-400 text-black font-display font-extrabold text-sm transition-all shadow-lg glow-amber disabled:opacity-50"
        >
          {isPending || isConfirming ? (
            <span className="flex items-center justify-center space-x-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Processing On-Chain...</span>
            </span>
          ) : (
            <span>
              {activeTab === 'deposit' ? `Deposit ${amount} USDso` : `Withdraw ${amount} USDso`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
