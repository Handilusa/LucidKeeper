import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LucidKeeper Uncaught Boundary Error]:', error, errorInfo);
  }

  public handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <main className="terminal-recovery">
          <section className="recovery-panel" aria-labelledby="recovery-title">
            <div className="flex items-center gap-3">
              <AlertOctagon className="w-8 h-8 flex-shrink-0 caution" aria-hidden="true" />
              <div>
                <h1 id="recovery-title">LucidKeeper couldn't render</h1>
                <p className="form-note">Reload the terminal to restore the interface.</p>
              </div>
            </div>

            <details className="recovery-details">
              <summary>Technical details</summary>
              <p>{this.state.error?.name || 'Error'}</p>
              <p>{this.state.error?.message || 'Unknown interface error'}</p>
            </details>

            <div className="flex flex-wrap gap-3 items-center justify-between">
              <span className="eyebrow">Somnia Tokyo testnet · 50383</span>
              <button
                onClick={this.handleReload}
                className="button button-primary"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Reload terminal</span>
              </button>
            </div>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
