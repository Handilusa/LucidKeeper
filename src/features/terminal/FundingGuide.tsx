import { BOUNTY_FUNDING, LIVE_TEST_ACCOUNT_PATH, PROJECT } from '@/content/project';
import { fundingState } from '@/lib/data/fundingState';

export function FundingGuide({ account, gas, wallet, deposited, margin, hasPositions, onManage, onGuardian }: {
  account: string; gas: bigint | undefined; wallet: bigint | undefined;
  deposited: bigint | undefined; margin: number | null; hasPositions: boolean | undefined;
  onManage: () => void; onGuardian: () => void;
}) {
  const { missingCollateral, notice } = fundingState({ gas, wallet, deposited, margin, hasPositions });
  return <section className="funding-guide" aria-label="Funding guidance">
    <h2>{notice || 'Your Tokyo funding'}</h2>
    {notice && <p>This is a normal unfunded-wallet state, not an application error. No transaction is needed to explore.</p>}
    <p>{gas === undefined ? 'STT balance unavailable; wait or refresh. Unknown does not mean zero.' : gas === 0n ? 'Missing: STT for Tokyo gas.' : 'STT detected; every action also checks its estimated gas cost.'}</p>
    <p>{wallet === undefined ? 'USDso wallet balance unavailable; unknown does not mean zero.' : wallet === 0n ? 'Wallet USDso: zero.' : 'USDso detected in your wallet. Deposit an exact amount to fund margin.'} {missingCollateral ? 'Missing: program-distributed USDso collateral; no deposited margin or positions detected.' : deposited === undefined || margin === null || hasPositions === undefined ? 'Margin or position reads unavailable; do not infer an empty account.' : deposited > 0n || hasPositions || margin > 0 ? 'Existing margin or positions detected. A zero wallet balance does not erase deposited collateral or exposure.' : 'No deposited margin detected.'}</p>
    <p>Profiles, history, public markets and docs remain available when their data sources respond. Guardian stress preview works with a real, freshly read position; without one, you can inspect the controls but no risk scenario is calculated.</p>
    <nav className="funding-links" aria-label="Read-only exploration">
      <a className="button" href={`/app/profile/${account}`}>Read-only profile & history</a>
      <a className="button" href={LIVE_TEST_ACCOUNT_PATH}>Live test account (read-only)</a>
      <a className="button" href="/app/docs#funding">Docs & funding guide</a>
      <button className="button" onClick={onGuardian}>Inspect Guardian</button>
    </nav>
    <details>
      <summary>Trading funding requirements</summary>
      <p>{BOUNTY_FUNDING}</p>
      <p>Missing funds? Request Tokyo STT and Builder Bounty USDso from the official bounty team in Discord for your own whitelisted wallet. Do not use Arena funds.</p>
      <p><a href={PROJECT.sdk} target="_blank" rel="noreferrer">Official dreamDEX testnet documentation ↗</a> · Verify Tokyo 50383 and your receiving address. LucidKeeper does not distribute funds or offer a claim.</p>
      <button className="button" disabled={!!notice} onClick={onManage}>Manage collateral</button>
    </details>
  </section>;
}
