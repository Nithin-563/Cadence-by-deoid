import { useSeoMeta } from "@unhead/react";
import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/landing/primitives";
import { Logo } from "@/components/landing/Logo";

const NotFound = () => {
  const location = useLocation();

  useSeoMeta({
    title: "404 — Page not found · Cadence",
    description:
      "The page you are looking for could not be found. Head back to the Cadence homepage to keep exploring.",
  });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--ember-300),transparent)] opacity-40 blur-3xl dark:opacity-20" />
      </div>

      <Container wide className="flex items-center justify-between py-6">
        <Link to="/" className="rounded-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
          <Logo />
        </Link>
      </Container>

      <main className="flex flex-1 items-center">
        <Container className="flex flex-col items-center py-16 text-center">
          <p className="font-display text-[6rem] leading-none text-ember-600 dark:text-ember-400 sm:text-[9rem]">
            404
          </p>
          <h1 className="mt-2 text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            We couldn’t find that page
          </h1>
          <p className="mt-3 max-w-md text-pretty text-muted-foreground">
            The link may be out of date, or the page may have moved. Let’s get you back to
            something useful.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild className="group h-11 rounded-full px-6">
              <Link to="/">
                <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
                Back to homepage
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-full px-6">
              <Link to="/#pricing">See pricing</Link>
            </Button>
          </div>
        </Container>
      </main>
    </div>
  );
};

export default NotFound;