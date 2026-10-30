import { useState } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { toast } from 'sonner';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';
import { saveTradeHistoryItem } from '@/lib/data/tradeHistory';
import { positiveDecimal } from '@/lib/math/orderInput';
import { Modal } from '@/components/Modal';
import { AUTHORIZED_SIGNER, MARGIN_HOLD, assertOnchainActionAllowed } from '@/lib/operating-policy.mjs';
import { reviewBrowserWrite } from '@/lib/browser-policy';

export function MarginHubModal({
  isOpen,
  onClose,
  unlockedMargin,
}: {
  isOpen: boolean;
  onClose: () => void;
  unlockedMargin: number | null;
}) {
  const { address, isConnected, chainId } = useAccount();
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
    query: { enabled: !!address && isOpen },
  });
  const walletUsdso =
    wallet.data !== undefined && !wallet.isError ? Number(formatUnits(wallet.data, 18)) : null;
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
      assertOnchainActionAllowed(activeTab, { chainId, wallet: address });
      const parsedAmount = parseUnits(amount, 18);
      if (activeTab === 'deposit') {
        const allowance = await publicClient.readContract({
          address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
          abi: erc20Abi,
          functionName: 'allowance',
          args: [address, CONTRACT_ADDRESSES.MARGIN_BANK],
        });
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
          const reviewed = await reviewBrowserWrite(publicClient, request, 'approve', address, { market: 'USDso collateral', size: amount, description: 'Approve exactly 2 USDso to the official Tokyo MarginBank.' });
          assertOnchainActionAllowed('approve', { chainId, wallet: address });
          const approval = await writeContractAsync({ ...request, ...reviewed });
          setHash(approval);
          setStatus('Approval submitted · awaiting receipt.');
          const receipt = await publicClient.waitForTransactionReceipt({ hash: approval });
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
            const reviewed = await reviewBrowserWrite(publicClient, request, 'deposit', address, { market: 'USDso collateral', size: amount, description: 'Deposit exactly 2 USDso to the authorized EOA MarginBank account.' });
            assertOnchainActionAllowed('deposit', { chainId, wallet: address });
            return writeContractAsync({ ...request, ...reviewed });
          })()
          : await Promise.reject(new Error('Withdrawal is outside the runtime bounty allowlist'));
      setHash(tx);
      setStatus('Transaction submitted · awaiting receipt.');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
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
      toast.success('Collateral transaction confirmed');
    } catch (error) {
      const message = (error as { shortMessage?: string }).shortMessage || (error as Error).message;
      setStatus(message);
      toast.error('Collateral operation failed', { description: message });
    } finally {
      setStep('idle');
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
        {MARGIN_HOLD.active && `HOLD: ${MARGIN_HOLD.reason} `}
        {activeTab === 'withdraw' && 'Withdrawal is outside the runtime bounty allowlist. '}
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
          MARGIN_HOLD.active ||
          activeTab === 'withdraw' ||
          address?.toLowerCase() !== AUTHORIZED_SIGNER.toLowerCase() ||
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
