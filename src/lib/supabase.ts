import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client.
 *
 * Values come from Vite env vars when the bundler supports them (real `vite`
 * builds — `npm run dev`, `npm run build`, Netlify), and fall back to this
 * project's public credentials otherwise.
 *
 * The anon / publishable key is **designed** to ship in the browser — it is
 * not a secret. Row Level Security in the database is what actually protects
 * the data, which is why every table in `supabase/schema.sql` has policies.
 * Set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY to point at a different
 * project without touching the code.
 */

const DEFAULT_URL = "https://gsmrqrhlswpkhfsqrlbl.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdzbXJxcmhsc3dwa2hmc3FybGJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExMzA5NjIsImV4cCI6MjEwNjcwNjk2Mn0.VKIpZ0eOUm6OyEGZF0aAAjVNO9yTDPqtwjUBKJHKvh0";

/**
 * Some bundlers substitute `import.meta.env` with a literal `{}`, so reading it
 * directly can throw. Guard every access.
 */
function readEnv(key: string): string | undefined {
  try {
    const env = (import.meta as { env?: Record<string, string | undefined> }).env;
    return env?.[key];
  } catch {
    return undefined;
  }
}

const url = readEnv("VITE_SUPABASE_URL") ?? DEFAULT_URL;
const anonKey = readEnv("VITE_SUPABASE_ANON_KEY") ?? DEFAULT_ANON_KEY;

/** True when the env vars supplied a non-default project. */
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

export interface ConnectionResult {
  ok: boolean;
  /** Which part of the setup is wrong, when we can tell. */
  problem: "invalid-key" | "no-schema" | "network" | "unknown";
  detail: string;
}

/**
 * Probe the project so misconfiguration shows up as a clear banner instead of
 * a generic "Invalid login credentials" or a loading screen that never ends.
 *
 * A single read against `profiles` tells us a lot:
 *   - 401 / "Invalid API key" -> the anon key is wrong or rotated
 *   - 404 / "relation ... does not exist" -> schema.sql has not been run
 *   - anything else -> surfaced verbatim
 */
export async function testConnection(): Promise<ConnectionResult> {
  try {
    const { data, error } = await supabase.from("profiles").select("id").limit(1);

    if (!error) {
      return { ok: true, problem: "unknown", detail: `Connected to ${url}` };
    }

    const text = `${error.message} ${error.code ?? ""}`.toLowerCase();

    if (text.includes("invalid api key") || text.includes("apikey")) {
      return {
        ok: false,
        problem: "invalid-key",
        detail:
          "Supabase rejected this project's anon key. Copy the current one from Project Settings → API and update VITE_SUPABASE_ANON_KEY (and DEFAULT_ANON_KEY in src/lib/supabase.ts).",
      };
    }

    if (text.includes("does not exist") || text.includes("schema cache")) {
      return {
        ok: false,
        problem: "no-schema",
        detail:
          "The project has no `profiles` table yet. Run supabase/schema.sql in the SQL editor.",
      };
    }

    if (text.includes("failed to fetch") || text.includes("network")) {
      return {
        ok: false,
        problem: "network",
        detail: `Could not reach ${url}. Check your connection.`,
      };
    }

    return { ok: false, problem: "unknown", detail: error.message };
  } catch (caught) {
    return {
      ok: false,
      problem: "network",
      detail: caught instanceof Error ? caught.message : "Could not reach Supabase.",
    };
  }
}