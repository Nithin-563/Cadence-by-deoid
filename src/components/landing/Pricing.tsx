import { Check } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

type Tier = {
  name: string;
  tagline: string;
  price: string;
  unit?: string;
  highlight?: boolean;
  cta: string;
  href: string;
  features: string[];
  footnote?: string;
};

const TIERS: Tier[] = [
  {
    name: "Community",
    tagline: "For a group chat that just needs to work.",
    price: "Free",
    cta: "Open Cadence",
    href: "/app",
    features: [
      "Unlimited servers and channels",
      "Unlimited messages, history and search",
      "Full role and permission system",
      "DMs, friends and the directory",
      "Realtime messaging, typing and presence",
      "Avatar uploads and generated avatars",
    ],
    footnote: "There is no paid tier. Cadence runs on your Supabase project.",
  },
  {
    name: "Self-hosted",
    tagline: "For teams that want to own their data.",
    price: "You host it",
    highlight: true,
    cta: "Read the setup guide",
    href: "#faq",
    features: [
      "Everything in Community",
      "Your own Supabase project — data never leaves your account",
      "Row Level Security on every table",
      "Bring your own auth providers",
      "EU or US data residency options",
      "Custom retention and backup policies",
    ],
    footnote: "You supply a Supabase project; Cadence is the client.",
  },
];

export function Pricing() {
  return (
    <Section id="pricing" className="border-y border-border/60 bg-muted/40">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="Pricing"
            title="Free, because there is nothing to sell you"
            lede="Cadence has no subscriptions, seats or usage tiers. Point it at a Supabase project and that's the whole cost model."
          />
        </Reveal>

        <div className="mt-12 grid items-start gap-5 lg:grid-cols-2">
          {TIERS.map((tier, index) => (
            <Reveal key={tier.name} delay={index * 90}>
              <div
                className={cn(
                  "relative flex h-full flex-col rounded-2xl border bg-card p-7 transition-all duration-300 sm:p-8",
                  tier.highlight
                    ? "border-ember-500/45 shadow-lg shadow-ember-500/10 lg:-my-3 lg:py-11"
                    : "border-border/70 shadow-sm hover:border-border hover:shadow-md",
                )}
              >
                <h3 className="text-lg font-semibold tracking-tight">{tier.name}</h3>
                <p className="mt-1.5 text-pretty text-sm text-muted-foreground">{tier.tagline}</p>

                <p className="mt-6 font-display text-4xl leading-none tracking-tight sm:text-5xl">
                  {tier.price}
                </p>
                <p className="mt-2 h-5 text-xs text-muted-foreground">{tier.unit ?? ""}</p>

                <Button asChild className="mt-6 w-full rounded-full">
                  <Link to={tier.href}>{tier.cta}</Link>
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
                ) : null}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="mt-10 text-center text-sm text-muted-foreground">
            The only thing you'll ever need is a{" "}
            <span className="font-medium text-foreground">free Supabase project</span> — the free
            tier is more than enough for a community.
          </p>
        </Reveal>
      </Container>
    </Section>
  );
}