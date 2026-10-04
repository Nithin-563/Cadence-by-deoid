import * as React from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Loader2, LogOut, RefreshCw, Terminal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

/** Full-screen spinner used while the session and profile settle. */
export function FullPageLoader({ label }: { label?: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label ?? "Opening Cadence…"}</p>
    </div>
  );
}

/**
 * Guards a subtree behind auth readiness.
 *
 * The important part: when loading fails we show *why* and offer a retry,
 * rather than leaving the user staring at "Opening Cadence…" forever.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, error, profile, configured, retry, signOut } = useAuth();

  if (!configured) return <SetupNotice />;
  if (status === "loading") return <FullPageLoader />;
  if (status === "error" || !profile) {
    return (
      <StuckNotice
        message={
          error ??
          "Signed in, but your profile could not be loaded. This usually means the Supabase key is wrong or the schema hasn't been applied yet."
        }
        onRetry={retry}
        onSignOut={() => void signOut()}
      />
    );
  }

  return <>{children}</>;
}

/** Shown when VITE_SUPABASE_URL / ANON_KEY are missing entirely. */
export function SetupNotice() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-2xl border bg-card p-8 text-center">
        <Terminal className="mx-auto size-8 text-ember-500" />
        <h1 className="mt-4 text-xl font-semibold">Connect Supabase to get started</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Cadence stores everything in Supabase. Add these two environment variables to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code> and
          restart the dev server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-left font-mono text-xs">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="mt-4 text-xs text-muted-foreground">
          Then run <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL
          editor.
        </p>
        <Button asChild variant="outline" className="mt-5 rounded-full">
          <Link to="/">Back to the landing page</Link>
        </Button>
      </div>
    </div>
  );
}

function StuckNotice({
  message,
  onRetry,
  onSignOut,
}: {
  message: string;
  onRetry: () => void;
  onSignOut: () => void;
}) {
  return (
    <div className="flex h-dvh items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-8">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/12">
            <AlertTriangle className="size-5 text-destructive" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">
              Cadence can’t load your account
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{message}</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border bg-muted/40 p-4">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Most likely causes
          </p>
          <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
            <li>
              <strong className="text-foreground">The anon key is wrong.</strong> Supabase →
              Project Settings → API → copy the current <code className="font-mono">anon</code> or{" "}
              <code className="font-mono">sb_publishable_…</code> key into{" "}
              <code className="font-mono">VITE_SUPABASE_ANON_KEY</code>.
            </li>
            <li>
              <strong className="text-foreground">The schema hasn’t been applied.</strong> Run{" "}
              <code className="font-mono">supabase/schema.sql</code> in the SQL editor.
            </li>
            <li>
              <strong className="text-foreground">Your account predates the schema.</strong> A new
              profile is created automatically — retry once the schema exists.
            </li>
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap gap-2.5">
          <Button onClick={onRetry} className="rounded-full">
            <RefreshCw className="size-4" /> Try again
          </Button>
          <Button variant="outline" className="rounded-full" onClick={onSignOut}>
            <LogOut className="size-4" /> Sign out
          </Button>
          <Button variant="ghost" className="rounded-full" asChild>
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}