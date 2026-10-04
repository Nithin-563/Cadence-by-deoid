import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, LogIn, Mail, UserPlus } from "lucide-react";

import { useSeoMeta } from "@unhead/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/landing/Logo";

type Mode = "signin" | "signup";

const USERNAME_RULES = "Lowercase letters, numbers, dots and underscores — 3 to 24 characters.";

function validateUsername(value: string): string | null {
  if (!/^[a-z0-9_.]{3,24}$/.test(value)) return USERNAME_RULES;
  return null;
}

export default function Login() {
  useSeoMeta({
    title: "Sign in · Cadence",
    description: "Sign in to Cadence, or create a free account to start your own servers.",
    robots: "noindex",
  });

  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, user, configured } = useAuth();

  const [mode, setMode] = React.useState<Mode>("signup");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [username, setUsername] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  // Already signed in? Skip straight into the app.
  React.useEffect(() => {
    if (user) navigate("/app", { replace: true });
  }, [user, navigate]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (mode === "signup") {
      const usernameError = validateUsername(username);
      if (usernameError) {
        setError(usernameError);
        return;
      }
    }
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        await signUp({
          email: email.trim(),
          password,
          username,
          displayName: displayName.trim() || username,
        });
        setNotice("Account created. If email confirmation is on, check your inbox, then sign in.");
        setMode("signin");
      } else {
        await signIn(email.trim(), password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in failed.");
      setBusy(false);
    }
  };

  if (!configured) {
    return (
      <div className="flex min-h-dvh items-center justify-center p-6">
        <div className="max-w-md rounded-2xl border bg-card p-8 text-center">
          <h1 className="text-xl font-semibold">Connect Supabase first</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set <code className="font-mono text-xs">VITE_SUPABASE_URL</code> and{" "}
            <code className="font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> in{" "}
            <code className="font-mono text-xs">.env.local</code>, then restart.
          </p>
          <Button asChild className="mt-5">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-48 left-1/2 size-[40rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--ember-300),transparent)] opacity-40 blur-3xl dark:opacity-20" />
      </div>

      <header className="px-5 py-5 sm:px-6">
        <Link to="/" className="inline-block rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md">
          <h1 className="font-display text-4xl tracking-tight">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "signup"
              ? "Pick a username — it's how people will find you on Cadence."
              : "Sign in to pick up where you left off."}
          </p>

          {error ? (
            <p
              role="alert"
              className="mt-5 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {notice ? (
            <p className="mt-5 rounded-lg border border-teal/40 bg-teal-soft px-4 py-2.5 text-sm text-teal">
              {notice}
            </p>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "signup" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display name</Label>
                  <Input
                    id="display-name"
                    value={displayName}
                    maxLength={48}
                    placeholder="Ada Lovelace"
                    autoComplete="name"
                    onChange={(event) => setDisplayName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="flex gap-2">
                    <span className="flex items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="username"
                      value={username}
                      maxLength={24}
                      placeholder="ada"
                      autoComplete="username"
                      className="font-mono"
                      onChange={(event) =>
                        setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{USERNAME_RULES}</p>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                autoComplete="email"
                placeholder="you@example.com"
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder="At least 6 characters"
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>

            <Button type="submit" size="lg" className="h-11 w-full rounded-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signup" ? (
                <>
                  <UserPlus className="size-4" /> Create account
                </>
              ) : (
                <>
                  <LogIn className="size-4" /> Sign in
                </>
              )}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="h-11 w-full rounded-full"
            onClick={google}
            disabled={busy}
          >
            <Mail className="size-4" /> Continue with Google
          </Button>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New to Cadence?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === "signup" ? "signin" : "signup");
                setError(null);
                setNotice(null);
              }}
              className="rounded font-medium text-foreground underline underline-offset-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {mode === "signup" ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
}
