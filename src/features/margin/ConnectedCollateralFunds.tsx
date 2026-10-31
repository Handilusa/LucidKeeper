import { useEffect, useState } from 'react';
import { useBalance, useReadContract } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { CONTRACT_ADDRESSES, erc20Abi, marginBankAbi } from '@/chain/abis';
import { readDisplay } from '@/lib/data/readDisplay';
import { AccountSummary } from '@/features/terminal/AccountSummary';
import { MarginHubModal } from './MarginHubModal';
import type { CollateralAction } from './CollateralActions';

/** Always manages the connected wallet, never the public address being watched. */
export function ConnectedCollateralFunds({
  account,
  className,
}: {
  account: Address;
  className?: string;
}) {
  const [action, setAction] = useState<CollateralAction>('deposit');
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(timer);
  }, []);
  const query = { refetchInterval: 3000 };
  const wallet = useReadContract({
    address: CONTRACT_ADDRESSES.COLLATERAL_USDSO,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [account],
    chainId: 50383,
    query,
  });
  const bank = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountState',
    args: [account],
    chainId: 50383,
    query,
  });
  const health = useReadContract({
    address: CONTRACT_ADDRESSES.MARGIN_BANK,
    abi: marginBankAbi,
    functionName: 'getAccountHealth',
    args: [account],
    chainId: 50383,
    query,
  });
  const gas = useBalance({ address: account, chainId: 50383, query });
  const units = (value: bigint | undefined) =>
    value === undefined ? null : Number(formatUnits(value, 18));
  const deposited = readDisplay(
    units(bank.data?.unlockedCollateralBalance),
    bank.dataUpdatedAt,
    bank.isError,
    now,
    30000
  );
  const locked = readDisplay(
    units(bank.data?.lockedCollateral),
    bank.dataUpdatedAt,
    bank.isError,
    now,
    30000
  );
  const available = readDisplay(
    health.data ? Math.max(0, units(health.data[0] - health.data[1])!) : null,
    health.dataUpdatedAt,
    health.isError,
    now,
    30000
  );
  const refresh = () => {
    void wallet.refetch();
    void bank.refetch();
    void health.refetch();
    void gas.refetch();
  };

  return (
    <section
      className={className || 'content-page profile-connected-funds'}
      aria-label="Connected wallet collateral"
    >
      <div className="funds-scope-banner">
        <span className="funds-scope-beacon" />
        <p className="form-note funds-scope-text">
          Funds actions apply only to your connected wallet, not a public watch address.
        </p>
      </div>
      <AccountSummary
        account={account}
        connected
        wallet={readDisplay(units(wallet.data), wallet.dataUpdatedAt, wallet.isError, now, 45000)}
        deposited={deposited}
        locked={locked}
        available={available}
        gas={readDisplay(units(gas.data?.value), gas.dataUpdatedAt, gas.isError, now, 45000)}
        onManage={(next = 'deposit') => {
          setAction(next);
          setOpen(true);
        }}
      />
      <MarginHubModal
        key={action}
        initialAction={action}
        isOpen={open}
        onClose={() => setOpen(false)}
        unlockedMargin={deposited.stale ? null : deposited.value}
        freeMargin={available.stale ? null : available.value}
        lockedMargin={locked.stale ? null : locked.value}
        onConfirmed={refresh}
      />
    </section>
  );
}
