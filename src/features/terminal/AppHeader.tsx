import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Brand, TestnetBadge } from '@/components/Brand';

export function AppHeader({
  onNavigate,
  page = 'trade',
}: {
  onNavigate?: (view: 'chart' | 'activity' | 'risk') => void;
  page?: 'trade' | 'portfolio' | 'docs';
}) {
  return (
    <header className="app-header site-app-header">
      <div className="header-left">
        <Brand />
        <nav className="global-nav" aria-label="Main navigation">
          <a href={page === 'trade' ? '#terminal' : '/app'} aria-current={page === 'trade' ? 'page' : undefined} onClick={() => onNavigate?.('chart')}>
            Trade
          </a>
          <a href="/app/profile" aria-current={page === 'portfolio' ? 'page' : undefined}>
            Portfolio
          </a>
          <a href="/app/docs" aria-current={page === 'docs' ? 'page' : undefined}>
            Docs
          </a>
        </nav>
      </div>
      <div className="header-actions">
        <div className="network-context">
          <span>Somnia Tokyo · 50383</span>
          <TestnetBadge />
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
