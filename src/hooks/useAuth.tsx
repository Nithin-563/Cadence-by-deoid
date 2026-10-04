import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { row, type Profile } from "@/lib/database.types";

export type AuthStatus = "loading" | "ready" | "error";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  status: AuthStatus;
  /** Human-readable reason when `status` is "error". */
  error: string | null;
  configured: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  retry: () => void;
}

export interface SignUpInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Friendly message for the errors Supabase actually returns. */
export function describeAuthError(error: { message: string }): Error {
  const message = error.message.toLowerCase();

  if (message.includes("invalid api key") || message.includes("apikey")) {
    return new Error(
      "Supabase rejected this project's API key. Open Project Settings → API, copy the current anon / publishable key, and update VITE_SUPABASE_ANON_KEY (plus the fallback in src/lib/supabase.ts).",
    );
  }
  if (message.includes("failed to fetch") || message.includes("network")) {
    return new Error("Couldn't reach Supabase. Check your connection and try again.");
  }
  if (message.includes("invalid login credentials")) {
    return new Error("That email and password combination didn't work.");
  }
  if (message.includes("email not confirmed")) {
    return new Error("Confirm your email address before signing in.");
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    return new Error("An account with that email already exists.");
  }
  if (message.includes("rate limit") || message.includes("too many")) {
    return new Error("Too many attempts. Wait a minute and try again.");
  }
  if (message.includes("password")) {
    return new Error("Passwords must be at least 6 characters.");
  }
  return new Error(error.message);
}

/** Derive a safe, unique-ish username when a profile has to be backfilled. */
function fallbackUsername(email: string): string {
  const base = (email.split("@")[0] ?? "user").toLowerCase().replace(/[^a-z0-9_.]/g, "");
  const trimmed = base.slice(0, 18);
  return trimmed.length >= 3 ? trimmed : `cadence_${Math.random().toString(36).slice(2, 8)}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [status, setStatus] = React.useState<AuthStatus>("loading");
  const [error, setError] = React.useState<string | null>(null);
  const [reloadToken, setReloadToken] = React.useState(0);

  const retry = React.useCallback(() => setReloadToken((token) => token + 1), []);

  /* ------------------------------------------------------------- session --- */
  // Deliberately does NOT touch any other Supabase method inside the callback —
  // awaiting a query from onAuthStateChange deadlocks the auth client.
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setSessionReady(true);
      return;
    }

    let active = true;

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setSessionReady(true);
      })
      .catch((caught: unknown) => {
        if (!active) return;
        setError(caught instanceof Error ? caught.message : "Could not read your session.");
        setStatus("error");
        setSessionReady(true);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ------------------------------------------------------------- profile --- */
  // Runs in its own effect so the profile query never happens inside an auth
  // callback, and so it re-runs whenever the signed-in user changes.
  React.useEffect(() => {
    if (!sessionReady) return;

    const userId = session?.user?.id;
    if (!userId) {
      setProfile(null);
      setStatus("ready");
      setError(null);
      return;
    }

    let active = true;
    setStatus("loading");
    setError(null);

    void (async () => {
      try {
        const existing = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (existing.error) throw describeAuthError(existing.error);

        let found = row<Profile>(existing.data);

        if (!found) {
          // The account predates the schema (or the signup trigger didn't fire),
          // so backfill the profile rather than hanging on a loading screen.
          const meta = session?.user?.user_metadata ?? {};
          const created = await supabase
            .from("profiles")
            .insert({
              id: userId,
              username: fallbackUsername(session?.user?.email ?? userId),
              display_name:
                typeof meta.display_name === "string" && meta.display_name
                  ? meta.display_name
                  : (session?.user?.email ?? "Cadence user").split("@")[0],
              about: typeof meta.about === "string" ? meta.about : "",
            })
            .select()
            .single();

          if (created.error) throw describeAuthError(created.error);
          found = row<Profile>(created.data);
        }

        if (!active) return;
        setProfile(found);
        setStatus("ready");
      } catch (caught) {
        if (!active) return;
        setProfile(null);
        setError(caught instanceof Error ? caught.message : "Could not load your profile.");
        setStatus("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id, sessionReady, reloadToken]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      status,
      error,
      configured: isSupabaseConfigured,
      async signUp({ email, password, username, displayName }) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: displayName },
            emailRedirectTo: `${window.location.origin}/app`,
          },
        });
        if (signUpError) throw describeAuthError(signUpError);
      },
      async signIn(email, password) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw describeAuthError(signInError);
      },
      async signInWithGoogle() {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${window.location.origin}/app` },
        });
        if (oauthError) throw describeAuthError(oauthError);
      },
      async signOut() {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) throw describeAuthError(signOutError);
        setProfile(null);
        setStatus("ready");
      },
      async refreshProfile() {
        const userId = session?.user?.id;
        if (!userId) return;
        const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
        const fresh = row<Profile>(data);
        if (fresh) setProfile(fresh);
      },
      retry,
    }),
    [session, profile, status, error, retry],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}