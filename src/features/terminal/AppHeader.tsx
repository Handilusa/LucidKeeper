import { ConnectButton } from '@rainbow-me/rainbowkit';

export function AppHeader({
  onNavigate,
}: {
  onNavigate: (view: 'chart' | 'activity' | 'risk') => void;
}) {
  return (
    <header className="app-header">
      <div className="header-left">
        <a
          href="#terminal"
          className="brand"
          aria-label="LucidKeeper trading terminal"
          onClick={() => onNavigate('chart')}
        >
          <svg className="brand-mark" viewBox="0 0 24 28" fill="none" aria-hidden="true">
            <path
              d="M3 4 12 1 21 4v11c0 5-5 9-9 12-4-3-9-7-9-12V4Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path d="M8 8v11h8M12 8v7h4" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          LucidKeeper
        </a>
        <nav className="global-nav" aria-label="Main navigation">
          <a href="#terminal" aria-current="page" onClick={() => onNavigate('chart')}>
            Trade
          </a>
          <a href="#activity" onClick={() => onNavigate('activity')}>
            Activity
          </a>
          <a href="#risk" onClick={() => onNavigate('risk')}>
            Guardian
          </a>
        </nav>
      </div>
      <div className="header-actions">
        <div className="network-context">
          <img className="somnia-mark" src="/assets/somnia-logomark.svg" width={24} height={18} alt="Somnia" />
          <span>Somnia Tokyo · 50383</span>
          <span className="testnet-badge">TESTNET</span>
        </div>
        <ConnectButton.Custom>
          {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
            const connected = mounted && account && chain;
            return (
              <button
                className={`button ${!connected ? 'button-primary' : ''}`}
                onClick={
                  !connected
                    ? openConnectModal
                    : chain.unsupported
                      ? openChainModal
                      : openAccountModal
                }
                type="button"
              >
                {!connected
                  ? 'Connect wallet'
                  : chain.unsupported
                    ? 'Switch network'
                    : account.displayName}
              </button>
            );
          }}
        </ConnectButton.Custom>
      </div>
    </header>
  );
}
