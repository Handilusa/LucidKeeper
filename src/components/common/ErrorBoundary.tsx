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
        <div className="min-h-screen bg-[#070a0e] text-slate-200 flex items-center justify-center p-4 font-mono">
          <div className="max-w-lg w-full bg-[#0d131d] border border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-rose-400">
              <AlertOctagon className="w-8 h-8 flex-shrink-0" />
              <div>
                <h2 className="text-lg font-bold text-white">LucidKeeper Protection Triggered</h2>
                <p className="text-xs text-rose-300">Se detectó una excepción en la interfaz React</p>
              </div>
            </div>

            <div className="p-3 bg-[#070a0e] rounded-lg border border-[#1a2536] text-xs text-slate-400 overflow-x-auto max-h-40">
              <p className="font-bold text-rose-400">{this.state.error?.name || 'Error'}</p>
              <p className="mt-1 text-[11px] font-mono">{this.state.error?.message || 'Error desconocido'}</p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-slate-500">Somnia Tokyo Testnet (50383)</span>
              <button
                onClick={this.handleReload}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Recargar Terminal</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
