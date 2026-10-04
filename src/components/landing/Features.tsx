import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Boxes,
  Check,
  GitPullRequestArrow,
  Headphones,
  Mail,
  MessageCircle,
  MessagesSquare,
  Sparkles,
  Star,
} from "lucide-react";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  visual?: ReactNode;
  /** Tailwind grid placement inside the bento. */
  span?: string;
};

const FEATURES: Feature[] = [
  {
    icon: MessagesSquare,
    title: "Every channel, one inbox",
    body: "Connect Zendesk, Intercom, Figma, Slack, Gong and more. Cadence dedupes, tags and links each item to the right account automatically.",
    span: "lg:col-span-3",
    visual: <InboxVisual />,
  },
  {
    icon: Sparkles,
    title: "Themes, found automatically",
    body: "On-topic clustering groups raw feedback into the 20 things that actually matter — refreshed every hour, with the evidence one click away.",
    span: "lg:col-span-2",
    visual: <ClusterVisual />,
  },
  {
    icon: Boxes,
    title: "Prioritised by impact",
    body: "Score every theme by revenue at risk, frequency and strategic fit so the top of the list is always the right next bet.",
    span: "lg:col-span-2",
    visual: <ScoreVisual />,
  },
  {
    icon: GitPullRequestArrow,
    title: "Closes the loop",
    body: "Auto-notify everyone who asked when their request ships. Customers see their words in the changelog and stop re-filing.",
    span: "lg:col-span-2",
    visual: <ClosedLoopVisual />,
  },
  {
    icon: Headphones,
    title: "Built for support handoffs",
    body: "Escalate to a shared inbox with full context, or hand off to sales with ARR attached. No more copy-paste.",
    span: "lg:col-span-2",
    visual: <HandoffVisual />,
  },
];

export function Features() {
  return (
    <Section id="features" className="relative">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="The platform"
            title={
              <>
                One place to hear every{" "}
                <span className="font-display italic text-ember-600 dark:text-ember-400">
                  customer
                </span>
              </>
            }
            lede="Cadence replaces the pile of tagged spreadsheets, shared inboxes and half-remembered sales calls with a single, always-current view of what your customers want."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-5">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={index * 70}
              className={cn("min-w-0", feature.span ?? "lg:col-span-2")}
            >
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-within:border-border sm:p-7">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-ember-500/15 to-gold-400/15 ring-1 ring-ember-500/20">
                  <feature.icon className="size-5 text-ember-600 dark:text-ember-400" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                {feature.visual ? (
                  <div className="mt-6 flex-1">{feature.visual}</div>
                ) : null}
              </article>
            </Reveal>
          ))}

          {/* Wide CTA tile */}
          <Reveal delay={120} className="lg:col-span-5">
            <div className="flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-ember-500/10 via-card to-gold-400/10 p-7 sm:flex-row sm:items-center sm:p-8">
              <div className="max-w-xl">
                <h3 className="text-xl font-semibold tracking-tight">
                  Connect your first source in under five minutes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Native integrations for 40+ tools, or push events to our API. Import your last
                  90 days of feedback on day one.
                </p>
              </div>
              <a
                href="#pricing"
                className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                See plans
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </a>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/* ---------------------------------------------------------------- visuals */

const SOURCES = [
  { icon: Headphones, label: "Zendesk", count: 1_284 },
  { icon: MessageCircle, label: "Intercom", count: 962 },
  { icon: Mail, label: "Gong calls", count: 740 },
  { icon: MessagesSquare, label: "#feedback", count: 611 },
];

function InboxVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Unified inbox
        </span>
        <span className="rounded-full bg-ember-500/12 px-2 py-0.5 text-[11px] font-medium text-ember-700 dark:text-ember-300">
          3,597 this week
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {SOURCES.map((source) => (
          <li key={source.label} className="flex items-center gap-3 px-4 py-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted">
              <source.icon className="size-3.5 text-muted-foreground" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{source.label}</span>
            <span className="text-[13px] tabular-nums text-muted-foreground">
              {source.count.toLocaleString()}
            </span>
            <Check className="size-3.5 shrink-0 text-teal" />
          </li>
        ))}
      </ul>
    </div>
  );
}

const CLUSTERS = [
  { label: "Bulk export", size: "text-[13px]", width: "82%", tone: "bg-ember-500/18 text-ember-700 dark:text-ember-300" },
  { label: "Dark mode", size: "text-[12px]", width: "64%", tone: "bg-gold-400/22 text-ember-700 dark:text-gold-300" },
  { label: "SSO / SCIM", size: "text-[11px]", width: "46%", tone: "bg-teal/18 text-teal" },
  { label: "Mobile offline", size: "text-[11px]", width: "38%", tone: "bg-muted text-muted-foreground" },
  { label: "Audit log", size: "text-[10px]", width: "28%", tone: "bg-muted text-muted-foreground" },
] as const;

function ClusterVisual() {
  return (
    <div className="flex flex-wrap gap-2 rounded-xl border border-border/70 bg-background/60 p-4">
      {CLUSTERS.map((cluster) => (
        <span
          key={cluster.label}
          className={cn(
            "rounded-full px-3 py-1.5 font-medium",
            cluster.size,
            cluster.tone,
          )}
          style={{ width: cluster.width }}
        >
          {cluster.label}
        </span>
      ))}
    </div>
  );
}

const SCORES = [
  { label: "Bulk export to CSV", score: 92, revenue: "$412k ARR" },
  { label: "SSO & SCIM", score: 74, revenue: "$1.2M ARR" },
  { label: "Dark mode", score: 41, revenue: "$86k ARR" },
] as const;

function ScoreVisual() {
  return (
    <ul className="space-y-2.5">
      {SCORES.map((row) => (
        <li key={row.label} className="rounded-xl border border-border/70 bg-background/60 p-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-[13px] font-medium">{row.label}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">{row.revenue}</span>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-linear-to-r from-ember-500 to-gold-400"
                style={{ width: `${row.score}%` }}
              />
            </div>
            <span className="w-6 text-right text-[11px] font-medium tabular-nums">{row.score}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ClosedLoopVisual() {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4">
      <ol className="relative space-y-3 border-l border-border pl-5">
        {[
          { label: "Request filed", meta: "Mar 4 · Intercom" },
          { label: "Shipped in v4.2", meta: "Apr 22 · Public changelog" },
          { label: "Customer notified", meta: "Apr 22 · Auto-email" },
        ].map((step) => (
          <li key={step.label} className="relative">
            <span
              aria-hidden="true"
              className="absolute -left-[1.4rem] top-1 size-2.5 rounded-full bg-linear-to-br from-ember-500 to-gold-400 ring-4 ring-background"
            />
            <p className="text-[13px] font-medium">{step.label}</p>
            <p className="text-[11px] text-muted-foreground">{step.meta}</p>
          </li>
        ))}
      </ol>
      <p className="mt-3 flex items-center gap-1.5 border-t border-border/60 pt-3 text-[12px] font-medium text-teal">
        <Star className="size-3.5" />
        38 advocates left a review
      </p>
    </div>
  );
}

function HandoffVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { to: "Sales · Meridian Co.", tag: "$240k ARR", tone: "text-ember-700 dark:text-ember-300" },
        { to: "Support · Tier 2 queue", tag: "Escalated", tone: "text-teal" },
        { to: "PM · Roadmap", tag: "Backlog", tone: "text-muted-foreground" },
      ].map((row) => (
        <div
          key={row.to}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
        >
          <span className="size-1.5 shrink-0 rounded-full bg-foreground/30" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{row.to}</span>
          <span className={cn("shrink-0 text-[11px] font-medium", row.tone)}>{row.tag}</span>
        </div>
      ))}
    </div>
  );
}