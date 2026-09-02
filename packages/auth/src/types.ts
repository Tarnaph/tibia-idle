export type AccountRole = 'player' | 'admin';

export interface AuthViewer {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  role: AccountRole;
}

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  role: AccountRole;
  created_at: string;
  updated_at: string;
}

export interface GameUpdateRow {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  published_at: string | null;
  updated_at: string;
  published: boolean;
}
