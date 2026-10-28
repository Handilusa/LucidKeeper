import React, { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { X, ArrowDownRight, ArrowUpRight, ShieldCheck } from 'lucide-react';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';
import { saveTradeHistoryItem } from '@/lib/data/tradeHistory';

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
  const publicClient = usePublicClient();
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState<string>('2.0');
  const [depositStep, setDepositStep] = useState<'idle' | 'approving' | 'depositing' | 'withdrawing'>('idle');

  // Read wallet USDso balance
  const { data: walletBalanceRaw, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
  });

  const walletUsdso = walletBalanceRaw ? parseFloat(formatUnits(walletBalanceRaw, 18)) : 0;
  const { writeContractAsync } = useWriteContract();

  if (!isOpen) return null;

  const isBusy = depositStep !== 'idle';

  const handleDeposit = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!publicClient) {
      toast.error('Somnia Tokyo RPC not connected');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid USDso amount');
      return;
    }

    if (numAmount > walletUsdso) {
      toast.error(`Insufficient wallet balance. You have ${walletUsdso.toFixed(2)} USDso.`);
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, 18);

      // 1. Check existing allowance on-chain
      const currentAllowance = await publicClient.readContract({
        address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [address, CONTRACT_ADDRESSES.MARGIN_BANK],
      });

      if (currentAllowance < parsedAmount) {
        setDepositStep('approving');
        toast.info('Step 1/2: Submitting exact USDso allowance approval...');
        const approveHash = await writeContractAsync({
          chainId: 50383,
          address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
          abi: erc20Abi,
          functionName: 'approve',
          args: [CONTRACT_ADDRESSES.MARGIN_BANK, parsedAmount],
        });

        toast.info('Step 1/2: Waiting for allowance confirmation on Somnia Tokyo...');
        await publicClient.waitForTransactionReceipt({ hash: approveHash });
        toast.success('Step 1/2: Collateral allowance confirmed on-chain!');
      }

      // 2. Deposit into MarginBank
      setDepositStep('depositing');
      toast.info('Step 2/2: Submitting deposit to MarginBank...');
      const depositHash = await writeContractAsync({
        chainId: 50383,
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        abi: marginBankAbi,
        functionName: 'deposit',
        args: [parsedAmount],
      });

      toast.info('Step 2/2: Waiting for deposit confirmation on Somnia Tokyo...');
      await publicClient.waitForTransactionReceipt({ hash: depositHash });
      toast.success(`Deposit of ${amount} USDso confirmed and credited!`, {
        description: `Tx: ${depositHash.slice(0, 10)}...${depositHash.slice(-8)}`,
      });

      // Optimistically record into local trade cache
      saveTradeHistoryItem(address, {
        id: `margin-${depositHash}`,
        hash: depositHash,
        type: 'deposit',
        amountUsdso: numAmount,
        timestamp: Date.now(),
        description: `Margin Deposit (${amount} USDso into MarginBank)`,
      });

      refetchBalance();
      setDepositStep('idle');
    } catch (err: unknown) {
      console.error('Deposit error:', err);
      setDepositStep('idle');
      const e = err as { shortMessage?: string; message?: string };
      toast.error('Deposit failed', {
        description: e?.shortMessage || e?.message || 'Transaction reverted or rejected',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) {
      toast.error('Connect your wallet first');
      return;
    }
    if (!publicClient) {
      toast.error('Somnia Tokyo RPC not connected');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid USDso amount');
      return;
    }

    if (numAmount > unlockedMargin) {
      toast.error(`Insufficient unlocked margin. Available: ${unlockedMargin.toFixed(2)} USDso.`);
      return;
    }

    try {
      const parsedAmount = parseUnits(amount, 18);
      setDepositStep('withdrawing');
      toast.info('Submitting collateral withdrawal from MarginBank...');

      const withdrawHash = await writeContractAsync({
        chainId: 50383,
        address: CONTRACT_ADDRESSES.MARGIN_BANK,
        abi: marginBankAbi,
        functionName: 'withdraw',
        args: [parsedAmount],
      });

      toast.info('Waiting for withdrawal confirmation on Somnia Tokyo...');
      await publicClient.waitForTransactionReceipt({ hash: withdrawHash });
      toast.success(`Withdrawal of ${amount} USDso confirmed!`, {
        description: `Tx: ${withdrawHash.slice(0, 10)}...${withdrawHash.slice(-8)}`,
      });

      saveTradeHistoryItem(address, {
        id: `margin-${withdrawHash}`,
        hash: withdrawHash,
        type: 'withdraw',
        amountUsdso: numAmount,
        timestamp: Date.now(),
        description: `Margin Withdrawal (${amount} USDso from MarginBank)`,
      });

      refetchBalance();
      setDepositStep('idle');
    } catch (err: unknown) {
      console.error('Withdraw error:', err);
      setDepositStep('idle');
      const e = err as { shortMessage?: string; message?: string };
      toast.error('Withdraw failed', {
        description: e?.shortMessage || e?.message || 'Transaction reverted or rejected',
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
              {walletBalanceRaw !== undefined ? `${walletUsdso.toFixed(2)} USDso` : '--'}
            </div>
            <span className="text-[10px] text-slate-500">ERC-20 Token</span>
          </div>

          <div className="p-3 rounded-lg bg-[#070a0e] border border-[#1a2536]">
            <span className="text-slate-400 text-[10px]">UNLOCKED MARGIN</span>
            <div className="text-cyan-400 font-bold text-base mt-1">
              {unlockedMargin > 0 ? `${unlockedMargin.toFixed(2)} USDso` : '0.00 USDso'}
            </div>
            <span className="text-[10px] text-slate-500">MarginBank Deposited</span>
          </div>
        </div>

        {/* Deposit / Withdraw Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#070a0e] border border-[#1a2536]">
          <button
            onClick={() => {
              if (!isBusy) setActiveTab('deposit');
            }}
            disabled={isBusy}
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
            onClick={() => {
              if (!isBusy) setActiveTab('withdraw');
            }}
            disabled={isBusy}
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
              disabled={isBusy}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Collateral amount in USDso"
              className="w-full px-3 py-2 pr-16 rounded-lg bg-[#070a0e] border border-[#1a2536] text-white font-mono text-sm focus:outline-hidden focus:border-cyan-500 disabled:opacity-50"
            />
            <span className="absolute right-3 top-2 text-xs font-mono text-slate-400 font-bold">
              USDso
            </span>
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-800/40 text-[11px] text-slate-400 font-mono space-y-1">
          <div className="text-cyan-400 font-bold flex items-center space-x-1">
            <span>🛡️ LucidKeeper Sequential Security Gate</span>
          </div>
          <p>
            Approvals grant exact amounts only. The deposit transaction strictly waits for on-chain
            confirmation of the allowance before submitting to prevent revert errors.
          </p>
        </div>

        {/* Action Button */}
        <button
          disabled={isBusy || parseFloat(amount) <= 0}
          onClick={activeTab === 'deposit' ? handleDeposit : handleWithdraw}
          className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-600 to-amber-500 hover:from-cyan-500 hover:to-amber-400 text-black font-display font-extrabold text-sm transition-all shadow-lg glow-amber disabled:opacity-50 cursor-pointer"
        >
          {depositStep === 'approving' && (
            <span className="flex items-center justify-center space-x-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Step 1/2: Approving USDso Allowance...</span>
            </span>
          )}
          {depositStep === 'depositing' && (
            <span className="flex items-center justify-center space-x-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Step 2/2: Depositing USDso to MarginBank...</span>
            </span>
          )}
          {depositStep === 'withdrawing' && (
            <span className="flex items-center justify-center space-x-2">
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
              <span>Withdrawing from MarginBank...</span>
            </span>
          )}
          {depositStep === 'idle' && (
            <span>
              {activeTab === 'deposit' ? `Deposit ${amount} USDso` : `Withdraw ${amount} USDso`}
            </span>
          )}
        </button>
      </div>
    </div>
  );
};
