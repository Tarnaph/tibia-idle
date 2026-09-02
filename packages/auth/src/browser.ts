'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabaseConfig } from './config';

let browserClient: SupabaseClient | null | undefined;

export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseConfig.url, supabaseConfig.publishableKey);
  }
  return browserClient;
}
