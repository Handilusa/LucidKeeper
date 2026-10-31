export type CollateralAction = 'deposit' | 'withdraw';

export function CollateralActions({ onAction }: { onAction: (action: CollateralAction) => void }) {
  return <div className="collateral-actions">
    <button className="button button-primary" onClick={() => onAction('deposit')}>Deposit collateral</button>
    <button className="button" onClick={() => onAction('withdraw')}>Withdraw</button>
  </div>;
}
