export interface SignOutProvider {
  signOut(): Promise<{ error: Error | null }>;
}

export async function performSignOut(provider: SignOutProvider): Promise<void> {
  const { error } = await provider.signOut();
  if (error) throw error;
}

export type AuthModalMode = 'login' | 'signup';

export interface AuthModalState {
  open: boolean;
  mode: AuthModalMode;
}

export type AuthModalAction =
  | { type: 'open-login' }
  | { type: 'open-signup' }
  | { type: 'switch'; mode: AuthModalMode }
  | { type: 'close' };

export function authModalReducer(state: AuthModalState, action: AuthModalAction): AuthModalState {
  switch (action.type) {
    case 'open-login': return { open: true, mode: 'login' };
    case 'open-signup': return { open: true, mode: 'signup' };
    case 'switch': return { ...state, mode: action.mode };
    case 'close': return { ...state, open: false };
  }
}
