const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
const supabasePublishableKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ?? ''
).trim();

export const supabaseConfig = {
  url: supabaseUrl,
  publishableKey: supabasePublishableKey,
};

export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'http://localhost:3000').replace(/\/$/, '');
}
