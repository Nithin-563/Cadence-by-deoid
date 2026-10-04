import * as React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Loader2, PartyPopper } from "lucide-react";

import { useSeoMeta } from "@unhead/react";

import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Logo } from "@/components/landing/Logo";

/** Landing page for an invite link: `/invite/:code`. */
export default function Invite() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user, status } = useAuth();

  const [phase, setPhase] = React.useState<"idle" | "joining" | "done" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  useSeoMeta({
    title: "You're invited to a Cadence server",
    description: "Join this Cadence server.",
    robots: "noindex",
  });

  const join = React.useCallback(async () => {
    if (!code) return;
    setPhase("joining");
    setError(null);
    const { error: joinError } = await supabase.rpc("join_server", { p_code: code });
    if (joinError) {
      setPhase("error");
      setError(joinError.message);
      return;
    }
    setPhase("done");
    window.setTimeout(() => navigate("/app", { replace: true }), 900);
  }, [code, navigate]);

  // Sign in first if we don't have a session yet.
  React.useEffect(() => {
    if (!user && status !== "loading") {
      navigate(`/login?next=${encodeURIComponent(`/invite/${code}`)}`, { replace: true });
    }
  }, [user, status, navigate, code]);

  // Auto-join once signed in and the profile is ready.
  React.useEffect(() => {
    if (user && phase === "idle") void join();
  }, [user, phase, join]);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-6">
        <Link to="/" className="inline-block">
          <Logo />
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center">
          {phase === "done" ? (
            <>
              <PartyPopper className="mx-auto size-8 text-ember-500" />
              <h1 className="mt-4 text-xl font-semibold">You're in!</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Taking you to the app…</p>
            </>
          ) : phase === "error" ? (
            <>
              <h1 className="text-xl font-semibold">That invite didn't work</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">{error}</p>
              <Button asChild className="mt-6 rounded-full">
                <Link to="/app">Go to Cadence</Link>
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
              <h1 className="mt-4 text-xl font-semibold">Joining the server…</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Invite code <span className="font-mono">{code}</span>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
