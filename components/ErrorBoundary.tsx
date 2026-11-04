import { logger } from '@/utils/logger';
import React from 'react';
import { AlertCircle } from 'lucide-react';

interface EBProps {}
interface EBState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<EBProps>,
  EBState
> {
  state: EBState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-bg-primary p-8 text-center animate-fade-in">
          <div className="card-premium p-10 max-w-2xl w-full">
            <div className="mb-6 inline-flex p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
              <AlertCircle size={48} className="text-red-500" />
            </div>
            <h1 className="h1 text-text-primary mb-4 uppercase tracking-tight">
              Ops! Algo deu errado.
            </h1>
            <p className="body text-text-secondary mb-8">
              Ocorreu um erro inesperado na renderização do sistema.
            </p>
            <div className="bg-bg-hover text-left p-6 rounded-xl mb-8 overflow-auto max-h-48 border border-border">
              <code className="text-accent text-xs font-mono">
                {this.state.error?.toString()}
              </code>
            </div>
            {this.state.error?.name === 'TypeError' &&
            this.state.error?.message?.includes('module') ? (
              <p className="text-amber-500 text-sm mb-4">
                Detectamos uma atualização no sistema. Por favor, clique abaixo
                para atualizar sua versão.
              </p>
            ) : null}
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="btn btn-primary btn-lg px-8"
            >
              Atualizar e Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
