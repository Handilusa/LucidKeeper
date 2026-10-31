import { lazy, Suspense, useEffect } from 'react';
import { Providers } from './Providers';
import { App } from './App';
import { AppHeader } from '@/features/terminal/AppHeader';
import { PROJECT } from '@/content/project';
import '@/styles/pages.css';

const Profile = lazy(() => import('@/features/profile/Profile'));

// Full document navigation preserves the terminal's existing beforeunload guard.
export default function TerminalRoutes() {
  const path = window.location.pathname.replace(/\/$/, '');
  useEffect(() => {
    document.title = `${path.endsWith('/profile') ? 'Portfolio' : path.endsWith('/docs') ? 'Field guide' : 'Trade'} | LucidKeeper`;
  }, [path]);
  return (
    <Providers>
      {path === '/app' ? (
        <App />
      ) : path === '/app/docs' ? (
        <DocsPage />
      ) : path === '/app/profile' ? (
        <Suspense
          fallback={
            <>
              <AppHeader page="portfolio" />
              <main className="content-page" role="status">
                Loading portfolio…
              </main>
            </>
          }
        >
          <Profile />
        </Suspense>
      ) : (
        <UnknownPage />
      )}
    </Providers>
  );
}

function DocsPage() {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to guide
      </a>
      <AppHeader page="docs" />
      <main className="content-page guide-page" id="main" tabIndex={-1}>
        <p className="eyebrow">LUCIDKEEPER FIELD GUIDE</p>
        <h1>
          Know the flow.
          <br />
          Review every action.
        </h1>
        <p className="page-lead">Somnia Tokyo testnet · chain 50383 · USDso collateral</p>
        <section>
          <h2>Start with a read-only visit</h2>
          <p>
            Launch the terminal without connecting to inspect public market prices and candles.
            Connect your wallet to load its positions, balances, history and account health.
            Disconnected visits do not select the bounty wallet or any other account. On-chain
            activity remains public; wallet-scoped display is not privacy.
          </p>
          <p>
            Any connected browser wallet can trade on Tokyo. LucidKeeper holds no keys; review
            every transaction before approving it in your wallet.
          </p>
        </section>
        <section id="funding">
          <h2>Funding your wallet</h2>
          <p>
            You need Tokyo STT for gas and USDso for dreamDEX margin. Use the official dreamDEX app
            for funding instructions and the one-time paper USDso credit, subject to eligibility and
            allowed-market restrictions. Verify the receiving address and Tokyo 50383: a generic
            Somnia faucet may use another network. If funding is unavailable, use official support.
          </p>
          <a className="button" href={PROJECT.sdk} target="_blank" rel="noreferrer">
            Official dreamDEX testnet guide ↗
          </a>
          <a className="button" href="https://app.testnet.dreamdex.io/perps" target="_blank" rel="noreferrer">Official funding / paper USDso ↗</a>
        </section>
        <section>
          <h2>From collateral to settlement</h2>
          <ol>
            <li>Connect your own wallet and select Somnia Tokyo.</li>
            <li>
              Open Manage collateral. Choose an exact USDso amount and review its approval, then separately review the
              deposit after confirmation.
            </li>
            <li>
              Select a market. Enter side and size in its tick/lot grid. Inspect available
              collateral and the margin breakdown.
            </li>
            <li>
              Review the complete unsigned IOC transaction before approving it. Read the receipt and
              actual fill; confirmation alone does not prove a position.
            </li>
            <li>
              Monitor positions and cross-margin health. Arm optional local SL/TP settings only
              while you can keep the tab active and approve requests.
            </li>
            <li>
              Review a close separately. Check actual fills and remaining position, then verify
              MarginBank settlement.
            </li>
          </ol>
        </section>
        <section>
          <h2>Important operating limits</h2>
          <p>
            Browser-local triggers stop when the tab is closed or suspended. Wallet approval,
            liquidity and fresh data are required. Partial fills and concurrent orders can change
            remaining size; a close is not a guaranteed reduce-only operation.
          </p>
          <p>
            IOC, limit, cancellation and withdrawals require separate wallet reviews. Limit orders
            use the existing five-minute expiry. Withdrawals depend on protocol health and credit
            rules. No mainnet support or custody by LucidKeeper.
          </p>
        </section>
        <section>
          <h2>Sources & troubleshooting</h2>
          <p>
            If a read is unavailable, use its retry control and inspect the linked explorer. Avoid
            treating cached data as a new account observation.
          </p>
          <div className="guide-links">
            <a href={PROJECT.github} target="_blank" rel="noreferrer">
              Source code ↗
            </a>
            <a href={`${PROJECT.github}/tree/main/feedback`} target="_blank" rel="noreferrer">
              SDK & application feedback ↗
            </a>
            <a href={PROJECT.explorer} target="_blank" rel="noreferrer">
              Tokyo explorer ↗
            </a>
          </div>
        </section>
        <a className="button button-primary" href="/app">
          Launch App
        </a>
      </main>
    </>
  );
}

function UnknownPage() {
  return (
    <>
      <AppHeader />
      <main className="content-page">
        <h1>Page not found</h1>
        <p>Return to the terminal or visit the field guide.</p>
        <a className="button button-primary" href="/app">
          Launch App
        </a>
      </main>
    </>
  );
}
