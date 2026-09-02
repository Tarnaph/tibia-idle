import { createServerSupabase } from '@/packages/auth/src/server';
import type { GameUpdateRow } from '@/packages/auth/src/types';

const updateColumns = 'id, title, slug, summary, content, published_at, updated_at, published';

export async function getPublishedUpdates(limit = 5): Promise<GameUpdateRow[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('game_updates')
    .select(updateColumns)
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Falha ao carregar atualizações públicas:', error.message);
    return [];
  }
  return (data ?? []) as GameUpdateRow[];
}

export async function getAllUpdatesForAdmin(): Promise<GameUpdateRow[]> {
  const supabase = await createServerSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('game_updates')
    .select(updateColumns)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Falha ao carregar atualizações administrativas:', error.message);
    return [];
  }
  return (data ?? []) as GameUpdateRow[];
}
