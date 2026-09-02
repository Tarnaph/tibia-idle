'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from '@/apps/web/auth/AuthProvider';
import type { AuthModalMode } from '@/packages/auth/src/authActions';

interface AuthModalProps {
  mode: AuthModalMode;
  onMode(mode: AuthModalMode): void;
  onClose(): void;
}

function authErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Não foi possível concluir. Tente novamente.';
  const message = error.message.toLowerCase();
  if (message.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (message.includes('already registered')) return 'Este e-mail já possui uma conta.';
  if (message.includes('password')) return 'A senha não atende aos requisitos do provedor.';
  return error.message;
}

export function AuthModal({ mode, onMode, onClose }: AuthModalProps) {
  const auth = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (isSignup && displayName.trim().length < 2) {
      setMessage('Informe um nome com pelo menos 2 caracteres.');
      return;
    }
    if (isSignup && password !== confirmPassword) {
      setMessage('As senhas não coincidem.');
      return;
    }

    setSubmitting(true);
    try {
      const result = isSignup
        ? await auth.signUp(displayName.trim(), email.trim(), password)
        : await auth.signIn(email.trim(), password);
      if (result.message) setMessage(result.message);
    } catch (error) {
      setMessage(authErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const google = async () => {
    setMessage(null);
    setSubmitting(true);
    try {
      await auth.signInWithGoogle();
    } catch (error) {
      setMessage(authErrorMessage(error));
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target) onClose();
    }}>
      <section className="auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">×</button>
        <div className="auth-brand"><span>C</span><strong>CAVEBOUND</strong></div>
        <p className="eyebrow">CONTA DO AVENTUREIRO</p>
        <h2 id="auth-title">{isSignup ? 'Criar conta' : 'Entrar no jogo'}</h2>
        <p className="auth-intro">{isSignup ? 'Crie sua conta para iniciar a expedição.' : 'Sua party está esperando por você.'}</p>

        {!auth.configured && (
          <div className="auth-notice" role="status">
            Supabase ainda não está configurado neste ambiente. Preencha o arquivo <code>.env.local</code> para habilitar entradas reais.
          </div>
        )}

        <form className="auth-form" onSubmit={submit}>
          {isSignup && (
            <label>Nome<input name="displayName" autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required minLength={2} maxLength={40} /></label>
          )}
          <label>E-mail<input name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
          <label>Senha<input name="password" type="password" autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={6} /></label>
          {isSignup && (
            <label>Confirmar senha<input name="confirmPassword" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={6} /></label>
          )}
          {message && <p className="auth-message" role="alert">{message}</p>}
          <button className="primary-button auth-submit" type="submit" disabled={submitting || !auth.configured}>
            {submitting ? 'AGUARDE…' : isSignup ? 'CRIAR CONTA' : 'ENTRAR'}
          </button>
        </form>

        <div className="auth-divider"><span>ou</span></div>
        <button className="google-button" type="button" onClick={google} disabled={submitting || !auth.configured}>
          <span aria-hidden="true">G</span> CONTINUAR COM GOOGLE
        </button>
        <p className="auth-switch">
          {isSignup ? 'Já possui uma conta?' : 'Ainda não possui conta?'}{' '}
          <button type="button" onClick={() => onMode(isSignup ? 'login' : 'signup')}>
            {isSignup ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </section>
    </div>
  );
}
