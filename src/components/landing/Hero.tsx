import { ArrowRight, CirclePlay, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Container, Reveal } from "@/components/landing/primitives";
import { AiSummaryCard, DashboardMockup } from "@/components/landing/DashboardMockup";

const TRUST_POINTS = ["No credit card", "14-day trial", "SOC 2 Type II"] as const;

export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
      {/* Layered backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="motion-safe:animate-drift absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--ember-300),transparent)] opacity-45 blur-3xl dark:opacity-25" />
        <div className="motion-safe:animate-drift absolute -top-24 right-[-10rem] size-[34rem] rounded-full bg-[radial-gradient(closest-side,var(--gold-300),transparent)] opacity-40 blur-3xl dark:opacity-20 [animation-delay:-6s]" />
        <div className="absolute inset-0 opacity-[0.45] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000,transparent)] dark:opacity-25" />
        {/* Fade the glows into the page background */}
        <div className="absolute inset-x-0 top-0 h-[36rem] bg-linear-to-b from-transparent via-transparent to-background" />
      </div>

      <Container className="flex flex-col items-center text-center">
        <Reveal>
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 py-1 pr-3 pl-1 text-xs font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="rounded-full bg-linear-to-r from-ember-500 to-gold-400 px-2 py-0.5 text-[11px] font-semibold text-white">
              New
            </span>
            Live channels, DMs and friends — open the app
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-7 max-w-4xl text-balance text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]">
            Stop guessing what to build next.
            <span className="font-display italic text-ember-600 dark:text-ember-400">
              {" "}
              Start listening.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Cadence pulls customer feedback from every channel you already use — support, calls,
            surveys, Slack — and turns it into prioritised, evidence-backed roadmap decisions your
            whole team can trust.
          </p>
        </Reveal>

        <Reveal delay={240}>
          <div className="mt-9 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
            <Button asChild size="lg" className="group h-12 w-full rounded-full px-7 text-base sm:w-auto">
              <Link to="/app">
                Open Cadence
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 w-full rounded-full px-7 text-base sm:w-auto"
            >
              <Link to="/app">
                <CirclePlay className="size-4 text-ember-500" />
                Watch 2-min demo
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-6 flex flex-col items-center gap-3">
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-gold-400 text-gold-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">4.9/5</span> from 1,200+ product teams
              · <span className="font-medium text-foreground">$40M+</span> ARR retained
            </p>
          </div>
        </Reveal>
      </Container>

      {/* Product mockup */}
      <Container wide className="relative mt-16 sm:mt-20">
        <Reveal delay={120}>
          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -inset-x-6 -top-6 bottom-0 rounded-[2rem] bg-linear-to-b from-ember-500/10 to-transparent blur-2xl"
            />
            <DashboardMockup className="relative" />
            <AiSummaryCard className="absolute -bottom-8 -left-2 hidden w-64 lg:block" />
            <div className="absolute -right-2 -bottom-10 hidden w-56 rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-foreground/10 backdrop-blur-xl xl:block">
              <p className="text-xs font-semibold">Closed-loop rate</p>
              <p className="font-display mt-1 text-3xl leading-none">74%</p>
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                of tagged feedback linked to a shipped item
              </p>
            </div>
          </div>
        </Reveal>

        <ul className="mt-16 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 sm:mt-20 lg:mt-28">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-teal" aria-hidden="true" />
              {point}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}