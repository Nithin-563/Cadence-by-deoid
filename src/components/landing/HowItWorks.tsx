import { Cable, Radar, Rocket } from "lucide-react";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";

const STEPS = [
  {
    icon: Cable,
    step: "01",
    title: "Connect everything",
    body: "Plug in your support tool, call recorder, survey platform and community. Import 90 days of history in one click, or stream events to our API as they happen.",
    detail: "Setup takes about four minutes. No data engineer required.",
  },
  {
    icon: Radar,
    step: "02",
    title: "Let Cadence find the signal",
    body: "Raw feedback is deduplicated, clustered into themes and scored on revenue at risk, frequency and strategic fit — continuously, not once a quarter.",
    detail: "Most teams see their first ranked backlog within the hour.",
  },
  {
    icon: Rocket,
    step: "03",
    title: "Ship, then close the loop",
    body: "Export the ranked list straight into Linear or Jira. When the work ships, Cadence notifies every customer who asked and publishes it to your changelog.",
    detail: "Closed-loop rate averages 74% across Cadence workspaces.",
  },
] as const;

const STATS = [
  { value: "18.4M", label: "Feedback items analysed" },
  { value: "3.4×", label: "Faster roadmap cycles" },
  { value: "74%", label: "Average closed-loop rate" },
  { value: "96%", label: "Annual logo retention" },
] as const;

export function HowItWorks() {
  return (
    <Section id="workflow" className="border-y border-border/60 bg-muted/40">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="How it works"
            title="From raw noise to shipped work in three moves"
            lede="Cadence sits on top of the tools you already pay for. Nothing to migrate, no new habit for your team to learn."
          />
        </Reveal>

        <ol className="relative mt-14 grid list-none gap-8 sm:mt-16 md:grid-cols-3 md:gap-6">
          {/* Connecting rail on desktop */}
          <div
            aria-hidden="true"
            className="absolute top-7 right-[16%] left-[16%] hidden h-px bg-linear-to-r from-ember-500/50 via-gold-400/50 to-teal/50 md:block"
          />

          {STEPS.map((step, index) => (
            <li key={step.step} className="relative">
              <Reveal delay={index * 100} className="text-center">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-border/70 bg-card shadow-sm">
                  <step.icon className="size-6 text-ember-600 dark:text-ember-400" />
                </div>
                <p className="mt-5 font-display text-sm tracking-[0.2em] text-muted-foreground uppercase">
                  {step.step}
                </p>
                <h3 className="mt-1.5 text-xl font-semibold tracking-tight">{step.title}</h3>
                <p className="mx-auto mt-2.5 max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
                <p className="mx-auto mt-4 max-w-xs rounded-full bg-card/80 px-3 py-1.5 text-[12px] font-medium text-muted-foreground ring-1 ring-border/70">
                  {step.detail}
                </p>
              </Reveal>
            </li>
          ))}
        </ol>

        {/* Stats band */}
        <Reveal delay={80}>
          <dl className="mt-16 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border/70 bg-border/70 sm:mt-20 lg:grid-cols-4">
            {STATS.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center bg-card px-6 py-8 text-center"
              >
                <dt className="order-2 mt-2 text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="order-1 font-display text-4xl leading-none tracking-tight text-ember-600 dark:text-ember-400 sm:text-5xl">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </Container>
    </Section>
  );
}