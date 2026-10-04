import * as React from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { row, type Profile } from "@/lib/database.types";

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True until the initial session + profile lookup settles. */
  loading: boolean;
  configured: boolean;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export interface SignUpInput {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

/** Friendly message for the errors Supabase actually returns. */
function describeAuthError(error: { message: string }): Error {
  const message = error.message.toLowerCase();
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load profile", error);
      setProfile(null);
      return;
    }
    setProfile(row<Profile>(data));
  }, []);

  // Initial session + react to sign-in/sign-out.
  React.useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let active = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      if (active) setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      if (next?.user && event !== "TOKEN_REFRESHED") {
        void loadProfile(next.user.id);
      }
      if (!next) setProfile(null);
      setLoading(false);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured: isSupabaseConfigured,
      async signUp({ email, password, username, displayName }) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username, display_name: displayName },
            emailRedirectTo: window.location.origin + "/app",
          },
        });
        if (error) throw describeAuthError(error);
      },
      async signIn(email, password) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw describeAuthError(error);
      },
      async signInWithGoogle() {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin + "/app" },
        });
        if (error) throw describeAuthError(error);
      },
      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw new Error(error.message);
        setProfile(null);
      },
      refreshProfile: async () => {
        if (session?.user) await loadProfile(session.user.id);
      },
    }),
    [session, profile, loading, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
