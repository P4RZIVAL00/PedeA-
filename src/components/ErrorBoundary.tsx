import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: any): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: any, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const { children } = this.props;
    if (this.state.hasError) {
      let errorMessage = "Ocorreu um erro inesperado.";
      
      try {
        // Check if it's a Firestore JSON error
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = `Erro no Banco de Dados: ${parsed.error}`;
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message) {
          errorMessage = this.state.error.message;
        }
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-bg-main">
          <div className="bg-surface p-8 rounded-xl shadow-lg max-w-md border border-red-200">
            <h2 className="text-2xl font-extrabold text-red-600 mb-4 tracking-tight">Ops! Algo deu errado.</h2>
            <p className="text-text-sub text-sm mb-8 font-medium">
              {errorMessage}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="btn-primary w-full py-4 text-base uppercase tracking-widest"
            >
              Recarregar Aplicativo
            </button>
          </div>
        </div>
      );
    }

    return children;
  }
}
