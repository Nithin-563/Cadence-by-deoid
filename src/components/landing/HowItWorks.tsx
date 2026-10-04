import { Link } from "react-router-dom";
import { KeyRound, MessageSquarePlus, UserPlus } from "lucide-react";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";

const STEPS = [
  {
    icon: UserPlus,
    step: "01",
    title: "Make an account",
    body: "Email and password, or Google. Pick a username — it becomes how people find you in the directory and DMs.",
    detail: "Your profile and generated avatar are created automatically.",
  },
  {
    icon: MessageSquarePlus,
    step: "02",
    title: "Create a server",
    body: "One click and you have a server with #general and #random. Add channels, roles and permissions for whatever the group is about.",
    detail: "You are the owner, so you start with every permission.",
  },
  {
    icon: KeyRound,
    step: "03",
    title: "Invite people",
    body: "Share the invite link. Anyone who joins appears in the member list with live presence, and can be messaged directly.",
    detail: "First message arrives in well under a second.",
  },
] as const;

const STATS = [
  { value: "15", label: "Permission bits per role" },
  { value: "40+", label: "Messages per page, on demand" },
  { value: "6", label: "Tables on the realtime stream" },
  { value: "0", label: "Servers needed to run it" },
] as const;

export function HowItWorks() {
  return (
    <Section id="workflow" className="border-y border-border/60 bg-muted/40">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="Getting started"
            title="From sign-up to a live channel in three steps"
            lede="No server to provision, no database to wire up. Cadence talks to Supabase directly from the browser."
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

        <Reveal delay={120}>
          <p className="mt-8 text-center text-sm text-muted-foreground">
            Ready when you are —{" "}
            <Link
              to="/login"
              className="rounded font-medium text-foreground underline decoration-ember-500/50 decoration-2 underline-offset-4 hover:decoration-ember-500"
            >
              create your account
            </Link>{" "}
            and start a server.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}