import { ArrowRight, Play, Shield, Sparkles, Star, Zap } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Container, Reveal } from "@/components/landing/primitives";
import { ProductShowcase } from "@/components/landing/ProductShowcase";

const HIGHLIGHTS = [
  { label: "Voice, video-ready", icon: Zap },
  { label: "15-bit role permissions", icon: Shield },
  { label: "Realtime, no polling", icon: Sparkles },
] as const;

export function Hero() {
  return (
    <section id="top" className="relative isolate overflow-hidden pt-32 pb-16 sm:pt-40 sm:pb-24">
      {/* Layered backdrop */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="motion-safe:animate-drift absolute -top-40 left-1/2 size-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--ember-300),transparent)] opacity-45 blur-3xl dark:opacity-25" />
        <div className="motion-safe:animate-drift absolute -top-24 right-[-10rem] size-[34rem] rounded-full bg-[radial-gradient(closest-side,var(--gold-300),transparent)] opacity-40 blur-3xl dark:opacity-20 [animation-delay:-6s]" />
        <div className="absolute inset-0 opacity-[0.45] [background-image:linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000,transparent)] dark:opacity-25" />
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
            Peer-to-peer voice channels are live
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>

        <Reveal delay={80}>
          <h1 className="mt-7 max-w-4xl text-balance text-4xl leading-[1.05] font-semibold tracking-[-0.03em] sm:text-6xl lg:text-[4.25rem]">
            Not another Discord clone.
            <span className="font-display italic text-ember-600 dark:text-ember-400">
              {" "}
              Yours, on your infrastructure.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={160}>
          <p className="mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Servers, text and voice channels, roles with real permissions, DMs, friends and
            file sharing — running on a Supabase project{" "}
            <span className="font-medium text-foreground">you</span> own. No platform, no
            per-seat pricing, no data leaving your account.
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
            <Button asChild size="lg" variant="outline" className="h-12 w-full rounded-full px-7 text-base sm:w-auto">
              <Link to="/login">
                <Play className="size-4 text-ember-500" />
                Create a free account
              </Link>
            </Button>
          </div>
        </Reveal>

        <Reveal delay={320}>
          <div className="mt-8 flex flex-col items-center gap-4">
            <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
              {HIGHLIGHTS.map((item) => (
                <li key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <item.icon className="size-3.5 text-teal" />
                  {item.label}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: 5 }).map((_, index) => (
                <Star key={index} className="size-4 fill-gold-400 text-gold-400" />
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Free forever · <span className="font-medium text-foreground">No credit card</span> ·
              Bring your own Supabase project
            </p>
          </div>
        </Reveal>
      </Container>

      <Container wide className="relative mt-16 sm:mt-20">
        <Reveal delay={120}>
          <ProductShowcase />
        </Reveal>
      </Container>
    </section>
  );
}
