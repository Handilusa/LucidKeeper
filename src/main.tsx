import React from 'react';
import ReactDOM from 'react-dom/client';
import { Providers } from './app/Providers';
import { App } from './app/App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Providers>
        <App />
      </Providers>
    </ErrorBoundary>
  </React.StrictMode>
);
