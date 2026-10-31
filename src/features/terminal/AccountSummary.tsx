import { HelpTip } from '@/components/HelpTip';
import { ReadValue } from '@/components/ReadValue';
import type { ReadDisplay } from '@/lib/data/readDisplay';
import { CollateralActions, type CollateralAction } from '@/features/margin/CollateralActions';

export function AccountSummary({
  account,
  connected,
  wallet,
  deposited,
  available,
  locked,
  gas,
  onManage,
}: {
  account?: string;
  connected: boolean;
  wallet: ReadDisplay;
  deposited: ReadDisplay;
  available: ReadDisplay;
  locked: ReadDisplay;
  gas: ReadDisplay;
  onManage: (action?: CollateralAction) => void;
}) {
  return (
    <section className="account-summary" aria-label="Account funds">
      <div className="account-heading">
        <span>
          {connected && account ? 'Connected account' : 'Connect your wallet to view account funds'}{' '}
          {connected && account && <span className="numeric">
            {account.slice(0, 6)}…{account.slice(-4)}
          </span>}
        </span>
        <button onClick={() => onManage()} className="text-cyan-400">
          Manage collateral ↗
        </button>
      </div>
      {connected && account && <CollateralActions onAction={onManage} />}
      <dl className="account-values">
        <div>
          <dt>Wallet assets</dt>
          <dd>
            {wallet.value == null || wallet.stale ? 'Unavailable' : <ReadValue read={wallet} />} <small>USDso</small>
          </dd>
        </div>
        <div>
          <dt>
            Bank collateral{' '}
            <HelpTip label="bank collateral">
              Unlocked collateral deposited in MarginBank, before position margin requirements. This
              is separate from tokens in your wallet.
            </HelpTip>
          </dt>
          <dd>
            {deposited.value == null || deposited.stale ? 'Unavailable' : <ReadValue read={deposited} />} <small>USDso</small>
          </dd>
        </div>
        <div>
          <dt>
            Available margin{' '}
            <HelpTip label="available margin">
              Account equity minus initial margin requirements, floored at zero. Execution and fees
              may change the amount you can use.
            </HelpTip>
          </dt>
          <dd>
            {available.value == null || available.stale ? 'Unavailable' : <ReadValue read={available} />} <small>USDso</small>
          </dd>
        </div>
        <div>
          <dt>Locked collateral</dt>
          <dd>{locked.value == null || locked.stale ? 'Unavailable' : <ReadValue read={locked} />} <small>USDso</small></dd>
        </div>
        <div>
          <dt>Gas funds</dt>
          <dd className={gas.value === 0 ? 'caution' : ''}>
            {gas.value == null || gas.stale ? 'Unavailable' : <ReadValue read={gas} decimals={4} />} <small>STT</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}
