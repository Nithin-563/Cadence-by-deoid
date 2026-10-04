import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase project credentials. Supplied as Vite env vars so the anon key
 * ships to the browser and the service-role key never does.
 *
 * Set both in `.env.local` for local dev, and in the Netlify site settings
 * for production (see README for the exact variable names).
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** False when the env vars are missing, so the UI can show setup instructions. */
export const isSupabaseConfigured = Boolean(url && anonKey);

/**
 * Pointed at a local supabase stack when unconfigured so calls fail loudly
 * with a clear message rather than throwing on a malformed URL.
 */
export const supabase: SupabaseClient = createClient(
  url ?? "http://127.0.0.1:54321",
  anonKey ?? "missing-anon-key",
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
    realtime: {
      params: { eventsPerSecond: 10 },
    },
  },
);
