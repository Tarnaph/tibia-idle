'use client';

import React, { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GameErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[GameErrorBoundary] Unhandled error caught in component tree:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(5, 5, 8, 0.92)',
            backdropFilter: 'blur(8px)',
            color: '#e2e8f0',
            fontFamily: 'sans-serif',
            padding: '20px',
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              backgroundColor: '#0f172a',
              border: '2px solid #ef4444',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>🛡️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#f87171', marginBottom: '8px' }}>
              {this.props.fallbackTitle || 'Ocorreu uma instabilidade na interface'}
            </h2>
            <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px', lineHeight: 1.5 }}>
              {this.props.fallbackMessage ||
                'O cliente de jogo interceptou o erro com segurança, evitando a interrupção da sua sessão.'}
            </p>
            {this.state.error?.message && (
              <pre
                style={{
                  backgroundColor: '#020617',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '10px',
                  fontSize: '11px',
                  color: '#cbd5e1',
                  textAlign: 'left',
                  maxHeight: '120px',
                  overflowY: 'auto',
                  marginBottom: '20px',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {this.state.error.message}
              </pre>
            )}
            <button
              type="button"
              onClick={this.handleReset}
              style={{
                backgroundColor: '#dc2626',
                color: '#fff',
                fontWeight: 'bold',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#b91c1c')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.backgroundColor = '#dc2626')}
            >
              🔄 Recuperar e Continuar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
