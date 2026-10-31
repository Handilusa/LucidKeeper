import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';
import { saveTradeHistoryItem } from '@/lib/data/tradeHistory';
import { positiveDecimal } from '@/lib/math/orderInput';
import { Modal } from '@/components/Modal';
import { reviewBrowserWrite, assertBrowserAccount } from '@/lib/browser-policy';
import { useWalletLifetime } from '@/lib/useWalletLifetime';
import { walletError } from '@/lib/walletError';

export function MarginHubModal({
  isOpen,
  onClose,
  unlockedMargin,
  onConfirmed,
}: {
  isOpen: boolean;
  onClose: () => void;
  unlockedMargin: number | null;
  onConfirmed?: () => void;
}) {
  const { address, isConnected, chainId } = useAccount();
  const lifetime = useWalletLifetime(address);
  const publicClient = usePublicClient({ chainId: 50383 });
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('2.0');
  const [step, setStep] = useState<
    'idle' | 'checking' | 'approving' | 'depositing' | 'withdrawing'
  >('idle');
  const [status, setStatus] = useState('');
  const [hash, setHash] = useState<string | null>(null);
  const wallet = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    chainId: 50383,
    query: { enabled: isConnected && !!address && isOpen },
  });
  const walletUsdso =
    isConnected && wallet.data !== undefined && !wallet.isError ? Number(formatUnits(wallet.data, 18)) : null;
  const { writeContractAsync } = useWriteContract();
  const busy = step !== 'idle';
  const numericAmount = positiveDecimal(amount);
  const tooPrecise = (amount.split('.')[1]?.length || 0) > 18;
  const invalid = !numericAmount || tooPrecise;
  const reportedBalance = activeTab === 'deposit' ? walletUsdso : unlockedMargin;
  const insufficient =
    numericAmount != null && reportedBalance != null && numericAmount > reportedBalance;

  async function submit() {
    if (
      busy ||
      invalid ||
      insufficient ||
      reportedBalance == null ||
      !isConnected ||
      !address ||
      chainId !== 50383 ||
      !publicClient
    )
      return;
    setStatus('');
    setHash(null);
    setStep('checking');
    try {
      lifetime.assert();
      const parsedAmount = parseUnits(amount, 18);
      if (activeTab === 'deposit') {
        const allowance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, CONTRACT_ADDRESSES.MARGIN_BANK],
        });
        lifetime.assert();
        if (allowance < parsedAmount) {
          setStep('approving');
          setStatus('Step 1 of 2 · review exact-amount approval in your wallet.');
          const request = {
            chainId: 50383,
            address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
            abi: erc20Abi,
            functionName: 'approve',
            args: [CONTRACT_ADDRESSES.MARGIN_BANK, parsedAmount],
          } as const;
          const reviewed = await reviewBrowserWrite(publicClient, request, 'approve', address, { market: 'USDso collateral', size: amount, description: `Approve exactly ${amount} USDso to the official Tokyo MarginBank.` }, lifetime.assert);
          lifetime.assert();
          assertBrowserAccount(address);
          const approval = await writeContractAsync({ ...request, ...reviewed });
          lifetime.assert();
          setHash(approval);
          setStatus('Approval submitted · awaiting receipt.');
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approval });
          lifetime.assert();
          if (receipt.status !== 'success')
            throw new Error('Approval reverted. Deposit was not submitted.');
        }
        setStep('depositing');
        setStatus('Step 2 of 2 · review the deposit in your wallet.');
      } else {
        setStep('withdrawing');
        setStatus('Review the withdrawal in your wallet.');
      }
      const tx =
        activeTab === 'deposit'
          ? await (async () => {
            const request = {
              chainId: 50383,
              address: CONTRACT_ADDRESSES.MARGIN_BANK,
              abi: marginBankAbi,
              functionName: 'deposit',
              args: [parsedAmount],
            } as const;
            const reviewed = await reviewBrowserWrite(publicClient, request, 'deposit', address, { market: 'USDso collateral', size: amount, description: `Deposit exactly ${amount} USDso to your MarginBank account (${address}).` }, lifetime.assert);
            lifetime.assert();
            assertBrowserAccount(address);
            return writeContractAsync({ ...request, ...reviewed });
          })()
          : await (async () => {
            const request = { chainId: 50383, address: CONTRACT_ADDRESSES.MARGIN_BANK, abi: marginBankAbi, functionName: 'withdraw', args: [parsedAmount] } as const;
            const reviewed = await reviewBrowserWrite(publicClient, request, 'withdraw', address, { market: 'USDso collateral', size: amount, description: `Withdraw ${amount} USDso from your MarginBank account to your wallet; protocol health limits apply.` }, lifetime.assert);
            lifetime.assert();
            assertBrowserAccount(address);
            return writeContractAsync({ ...request, ...reviewed });
          })();
      lifetime.assert();
      setHash(tx);
      setStatus('Transaction submitted · awaiting receipt.');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
      lifetime.assert();
      if (receipt.status !== 'success') throw new Error('Transaction reverted.');
      setStatus(
        `${activeTab === 'deposit' ? 'Deposit' : 'Withdrawal'} transaction confirmed. Refreshing balances.`
      );
      saveTradeHistoryItem(address, {
        id: `margin-${tx}`,
        hash: tx,
        type: activeTab,
        amountUsdso: numericAmount!,
        timestamp: Date.now(),
        description: `Margin ${activeTab} transaction confirmed (${amount} USDso)`,
      });
      void wallet.refetch();
      onConfirmed?.();
      toast.success('Collateral transaction confirmed');
    } catch (error) {
      if (!lifetime.current()) return;
      const message = walletError(error);
      setStatus(message);
      toast.error('Collateral operation failed', { description: message });
    } finally {
      if (lifetime.current()) setStep('idle');
    }
  }

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Manage collateral"
      description="Move USDso between your wallet and MarginBank on Somnia Tokyo testnet (50383). STT is used separately for gas."
    >
      <dl className="account-values mb-5" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div>
          <dt>Wallet assets</dt>
          <dd>
            {isConnected && walletUsdso != null && !wallet.isError ? walletUsdso.toFixed(2) : '—'}{' '}
            <small>USDso</small>
          </dd>
        </div>
        <div>
          <dt>Bank collateral</dt>
          <dd>
            {isConnected && unlockedMargin != null ? unlockedMargin.toFixed(2) : '—'}{' '}
            <small>USDso</small>
          </dd>
        </div>
      </dl>
      <div className="order-types" role="group" aria-label="Collateral action">
        {(['deposit', 'withdraw'] as const).map((value) => (
          <button
            key={value}
            disabled={busy}
            aria-pressed={activeTab === value}
            onClick={() => {
              setActiveTab(value);
              setStatus('');
            }}
          >
            {value === 'deposit' ? 'Deposit' : 'Withdraw'}
          </button>
        ))}
      </div>
      <div className="field">
        <label className="field-label" htmlFor="collateral-amount">
          Amount
        </label>
        <div className="input-wrap">
          <input
            id="collateral-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            disabled={busy}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!!invalid}
            aria-describedby="collateral-help collateral-error"
          />
          <span>USDso</span>
        </div>
      </div>
      <p id="collateral-help" className="form-note mb-4">
        {activeTab === 'deposit'
          ? 'If needed, approve this exact amount first. The deposit waits for a successful approval receipt.'
          : 'Active positions may restrict withdrawals. Bank collateral is not a guarantee of withdrawable funds.'}
      </p>
      <div id="collateral-error" aria-live="polite">
        {invalid ? (
          <p className="form-error">Enter a positive amount with at most 18 decimal places.</p>
        ) : isConnected && reportedBalance == null ? (
          <p className="form-error">Balance unavailable. Waiting for current account data.</p>
        ) : isConnected && insufficient ? (
          <p className="form-error">
            Amount exceeds the reported{' '}
            {activeTab === 'deposit' ? 'wallet balance' : 'bank collateral'}.
          </p>
        ) : null}
      </div>
      <button
        className="button button-primary w-full"
        disabled={
          busy ||
          !isConnected ||
          chainId !== 50383 ||
          !!invalid ||
          insufficient ||
          reportedBalance == null ||
          (activeTab === 'deposit' && (walletUsdso == null || wallet.isError))
        }
        onClick={() => void submit()}
      >
        {!isConnected
          ? 'Connect your wallet first'
          : chainId !== 50383
            ? 'Switch to Tokyo first'
            : busy
              ? `${step[0].toUpperCase() + step.slice(1)}…`
              : `${activeTab === 'deposit' ? 'Deposit' : 'Withdraw'} ${amount} USDso`}
      </button>
      <div className="transaction-status" aria-live="polite">
        {status}
        {hash && (
          <p>
            <a
              href={`https://explorer.testnet.somnia.network/tokyo/tx/${hash}`}
              target="_blank"
              rel="noreferrer"
            >
              View transaction ↗
            </a>
          </p>
        )}
      </div>
    </Modal>
  );
}
