import React from 'react';
import ReactDOM from 'react-dom/client';
import { lazy, Suspense } from 'react';
import Landing from './features/landing/Landing';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { TestnetBadge } from './components/Brand';
import './styles/globals.css';

const TerminalRoutes = lazy(() => import('./app/TerminalRoutes'));
const isApp = window.location.pathname === '/app' || window.location.pathname.startsWith('/app/');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      {isApp ? <Suspense fallback={<main className="content-page"><TestnetBadge /><p role="status">Loading LucidKeeper…</p></main>}><TerminalRoutes /></Suspense> : window.location.pathname === '/' ? <Landing /> : <main className="content-page"><TestnetBadge /><h1>Page not found</h1><a className="button" href="/">Go to homepage</a></main>}
    </ErrorBoundary>
  </React.StrictMode>
);
