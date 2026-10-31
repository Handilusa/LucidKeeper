export function FundingGuide({ gas, wallet, margin, onManage }: {
  gas: bigint | undefined; wallet: bigint | undefined; margin: number | null; onManage: () => void;
}) {
  return <section className="form-note" aria-label="Funding guidance">
    <strong>Fund your wallet on Tokyo 50383</strong>
    <p>{gas === undefined ? 'STT balance unavailable; wait or refresh.' : gas === 0n ? 'No STT for gas. Obtain Tokyo STT before submitting transactions.' : 'STT detected; every action also checks its estimated gas cost.'}</p>
    <p>{wallet === undefined ? 'USDso wallet balance unavailable.' : wallet === 0n ? 'No wallet USDso. Get test collateral or check whether paper credit was credited directly to your margin account.' : 'USDso detected. Choose an exact amount in Manage collateral.'} {margin !== null && margin <= 0 && 'No available margin yet.'}</p>
    <p><a href="https://app.testnet.dreamdex.io/perps" target="_blank" rel="noreferrer">Official dreamDEX funding / paper USDso ↗</a> · <a href="https://app.testnet.dreamdex.io/docs/developers/perps-testnet" target="_blank" rel="noreferrer">Tokyo STT and collateral instructions ↗</a></p>
    <p>Verify the official origin and receiving address in dreamDEX before any claim. Paper credit is one-time, subject to eligibility and market restrictions; it is not freely withdrawable USDso. For Tokyo gas or missing collateral, use official support. A generic Somnia faucet may target chain 50312, not Tokyo.</p>
    <button className="button" onClick={onManage}>Manage collateral</button>
  </section>;
}
