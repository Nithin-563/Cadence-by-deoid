import * as React from "react";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

type Cycle = "monthly" | "annual";

type Tier = {
  name: string;
  tagline: string;
  monthly: number | null;
  annual: number | null;
  unit?: string;
  highlight?: boolean;
  cta: string;
  features: string[];
  footnote?: string;
};

const TIERS: Tier[] = [
  {
    name: "Starter",
    tagline: "For a small team getting serious about feedback.",
    monthly: 49,
    annual: 39,
    unit: "seat / mo",
    cta: "Start free trial",
    features: [
      "3,000 feedback items / month",
      "3 data sources",
      "Automatic theme clustering",
      "Public changelog page",
      "Slack notifications",
    ],
    footnote: "Includes a 14-day trial of every feature.",
  },
  {
    name: "Growth",
    tagline: "For product teams that need the full signal.",
    monthly: 129,
    annual: 99,
    unit: "seat / mo",
    highlight: true,
    cta: "Start free trial",
    features: [
      "Unlimited feedback items",
      "Unlimited data sources",
      "Revenue-at-risk scoring",
      "Cadence AI summaries & drafts",
      "Linear, Jira and HubSpot sync",
      "Closed-loop automations",
      "Priority support",
    ],
    footnote: "Most popular — switch or cancel any time.",
  },
  {
    name: "Enterprise",
    tagline: "For organisations with security and scale needs.",
    monthly: null,
    annual: null,
    cta: "Talk to sales",
    features: [
      "Everything in Growth",
      "SSO, SCIM & audit logs",
      "Data residency (EU / US)",
      "Custom retention policies",
      "Dedicated success manager",
      "99.9% uptime SLA",
    ],
    footnote: "Volume and seat discounts available.",
  },
];

export function Pricing() {
  const [cycle, setCycle] = React.useState<Cycle>("annual");

  return (
    <Section id="pricing" className="border-y border-border/60 bg-muted/40">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pricing that scales with your team"
            lede="Every plan includes unlimited sources, the full integration catalogue and our SOC 2 Type II audited pipeline."
          />
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-9 flex justify-center">
            <div
              role="group"
              aria-label="Billing period"
              className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-card p-1 shadow-sm"
            >
              {(["monthly", "annual"] as const).map((option) => {
                const active = cycle === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setCycle(option)}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option === "monthly" ? "Monthly" : "Annual"}
                    {option === "annual" ? (
                      <span
                        className={cn(
                          "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                          active ? "bg-background/20 text-background" : "bg-ember-500/15 text-ember-600 dark:text-ember-400",
                        )}
                      >
                        −20%
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-3">
          {TIERS.map((tier, index) => {
            const price = cycle === "annual" ? tier.annual : tier.monthly;
            return (
              <Reveal key={tier.name} delay={index * 90}>
                <div
                  className={cn(
                    "relative flex h-full flex-col rounded-2xl border bg-card p-7 transition-all duration-300",
                    tier.highlight
                      ? "border-ember-500/45 shadow-lg shadow-ember-500/10 lg:-my-3 lg:py-10"
                      : "border-border/70 shadow-sm hover:border-border hover:shadow-md",
                  )}
                >
                  {tier.highlight ? (
                    <Badge className="absolute -top-3 left-7 border-0 bg-linear-to-r from-ember-500 to-gold-400 text-white shadow-sm">
                      Most popular
                    </Badge>
                  ) : null}

                  <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
                  <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{tier.tagline}</p>

                  <div aria-live="polite">
                    <div className="mt-6 flex min-h-14 items-baseline gap-1.5">
                      {price === null ? (
                        <span className="font-display text-4xl tracking-tight">Custom</span>
                      ) : (
                        <>
                          <span className="font-display text-5xl leading-none tracking-tight">
                            ${price}
                          </span>
                          <span className="text-sm text-muted-foreground">{tier.unit}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-1.5 h-5 text-xs text-muted-foreground">
                      {price === null
                        ? "Annual invoicing"
                        : cycle === "annual"
                          ? `Billed annually · $${price * 12} / year`
                          : "Billed monthly"}
                    </p>
                  </div>

                  <Button
                    className={cn(
                      "mt-6 w-full rounded-full",
                      tier.highlight && "shadow-sm",
                    )}
                    variant={tier.highlight ? "default" : "outline"}
                  >
                    {tier.cta}
                  </Button>

                  <ul className="mt-7 space-y-3">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-teal" />
                        <span className="text-pretty leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {tier.footnote ? (
                    <p className="mt-7 border-t border-border/60 pt-4 text-xs text-muted-foreground">
                      {tier.footnote}
                    </p>
                  ) : (
                    <div className="mt-7" />
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={120}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Non-profits and early-stage startups get{" "}
            <span className="font-medium text-foreground">50% off for two years</span> — just ask.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}