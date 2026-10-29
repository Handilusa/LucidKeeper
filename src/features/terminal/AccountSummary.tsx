import { HelpTip } from '@/components/HelpTip';
import { ReadValue } from '@/components/ReadValue';
import type { ReadDisplay } from '@/lib/data/readDisplay';

export function AccountSummary({
  account,
  connected,
  wallet,
  deposited,
  available,
  gas,
  onManage,
}: {
  account: string;
  connected: boolean;
  wallet: ReadDisplay;
  deposited: ReadDisplay;
  available: ReadDisplay;
  gas: ReadDisplay;
  onManage: () => void;
}) {
  return (
    <section className="account-summary" aria-label="Account funds">
      <div className="account-heading">
        <span>
          {connected ? 'Connected account' : 'Read-only bounty account'}{' '}
          <span className="numeric">
            {account.slice(0, 6)}…{account.slice(-4)}
          </span>
        </span>
        <button onClick={onManage} className="text-cyan-400">
          Manage collateral ↗
        </button>
      </div>
      <dl className="account-values">
        <div>
          <dt>Wallet assets</dt>
          <dd>
            <ReadValue read={wallet} /> <small>USDso</small>
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
            <ReadValue read={deposited} /> <small>USDso</small>
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
            <ReadValue read={available} /> <small>USDso</small>
          </dd>
        </div>
        <div>
          <dt>Gas funds</dt>
          <dd className={gas.value === 0 ? 'caution' : ''}>
            <ReadValue read={gas} decimals={4} /> <small>STT</small>
          </dd>
        </div>
      </dl>
    </section>
  );
}
