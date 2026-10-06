import { useSeoMeta } from "@unhead/react";
import { Link } from "react-router-dom";

const Index = () => {
  useSeoMeta({
    title: "Cadence — Discord-style chat with servers and channels",
    description:
      "A Discord-style chat app with servers, text and voice channels, roles, granular permissions, DMs and file sharing. Runs on a Supabase project you own.",
    ogTitle: "Cadence — Discord-style chat with servers and channels",
    ogDescription:
      "Servers, text and voice channels, roles and permissions, DMs and file sharing — on infrastructure you control.",
    ogType: "website",
    twitterCard: "summary_large_image",
  });

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      <main id="main" className="flex flex-col items-center justify-center px-4 py-16">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Welcome to Cadence
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Discord-style chat with servers, channels, roles, and permissions.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/app"
              className="rounded-full bg-foreground px-8 py-3 font-medium text-background transition-opacity hover:opacity-90"
            >
              Open Cadence
            </Link>
            <Link
              to="/login"
              className="rounded-full border border-border/80 bg-background px-8 py-3 font-medium text-foreground transition-colors hover:bg-muted/50"
            >
              Sign in
            </Link>
          </div>
          <p className="mt-8 text-sm text-muted-foreground">
            Your own Supabase project required. Free to use.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;