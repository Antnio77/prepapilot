"use client";

import { createBrowserClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;

/**
 * Returns null when Supabase env vars are missing so the app can fall back to
 * local-only mode instead of crashing — see .env.example. Reuses a single client
 * instance (Supabase warns if you construct more than one GoTrueClient per tab).
 */
export function getSupabaseBrowserClient() {
  if (!isSupabaseConfigured) return null;
  if (!cachedClient) cachedClient = createBrowserClient(url!, anonKey!);
  return cachedClient;
}
