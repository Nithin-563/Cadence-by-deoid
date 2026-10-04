import { Quote } from "lucide-react";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  initials: string;
  /** Two-stop gradient for the avatar tile. */
  tone: string;
  metric?: { value: string; label: string };
};

const FEATURED: Testimonial = {
  quote:
    "We killed three roadmap spreadsheets in the first month. The part nobody expects is the closed loop — customers started telling us they'd seen their own words in a changelog, and our NPS moved 14 points in a quarter.",
  name: "Priya Raghunathan",
  role: "VP Product, Northwind",
  initials: "PR",
  tone: "from-ember-500 to-gold-400",
  metric: { value: "+14 pts", label: "NPS in one quarter" },
};

const REST: Testimonial[] = [
  {
    quote:
      "Our last roadmap review used to take two weeks of prep. Now it's a Tuesday meeting with a ranked list that's already been through finance.",
    name: "Marcus Adeyemi",
    role: "Head of Product, Halo Labs",
    initials: "MA",
    tone: "from-teal to-ember-400",
    metric: { value: "−6 days", label: "Planning cycle" },
  },
  {
    quote:
      "The revenue-at-risk scoring was the unlock. Support told us an export feature was annoying. Cadence showed us it was $412k of ARR.",
    name: "Sofia Lindqvist",
    role: "CPO, Meridian",
    initials: "SL",
    tone: "from-gold-400 to-ember-500",
    metric: { value: "$412k", label: "ARR surfaced" },
  },
  {
    quote:
      "We run support in three languages. Cadence translated, clustered and still pointed back to the original recording every single time.",
    name: "Tomás Herrera",
    role: "Director of CX, Tidewater",
    initials: "TH",
    tone: "from-ember-600 to-teal",
    metric: { value: "3.1×", label: "Tickets triaged" },
  },
];

function Avatar({ testimonial }: { testimonial: Testimonial }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-xs font-semibold text-white",
        testimonial.tone,
      )}
    >
      {testimonial.initials}
    </span>
  );
}

export function Testimonials() {
  return (
    <Section id="customers">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="Customers"
            title="Teams ship faster when they stop guessing"
            lede="From seed-stage startups to public companies — here is what changes once the whole company can see the same signal."
          />
        </Reveal>

        <div className="mt-14 grid gap-5 sm:mt-16 lg:grid-cols-2">
          {/* Featured quote */}
          <Reveal className="lg:col-span-2">
            <figure className="relative flex h-full flex-col justify-between gap-8 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-ember-500/10 via-card to-gold-400/10 p-7 sm:p-10">
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-10 size-56 rounded-full bg-[radial-gradient(closest-side,var(--gold-300),transparent)] opacity-40 blur-2xl dark:opacity-20"
              />
              <div className="relative">
                <Quote className="size-7 text-ember-500" />
                <blockquote className="mt-5 max-w-3xl text-pretty text-xl leading-snug font-medium tracking-tight text-balance sm:text-2xl lg:text-[1.75rem]">
                  {FEATURED.quote}
                </blockquote>
              </div>
              <figcaption className="relative flex flex-wrap items-center justify-between gap-4 border-t border-border/60 pt-6">
                <div className="flex items-center gap-3">
                  <Avatar testimonial={FEATURED} />
                  <div>
                    <p className="text-sm font-semibold">{FEATURED.name}</p>
                    <p className="text-[13px] text-muted-foreground">{FEATURED.role}</p>
                  </div>
                </div>
                {FEATURED.metric ? (
                  <div className="rounded-xl border border-border/70 bg-card/80 px-4 py-2 text-center">
                    <p className="font-display text-xl leading-none">{FEATURED.metric.value}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{FEATURED.metric.label}</p>
                  </div>
                ) : null}
              </figcaption>
            </figure>
          </Reveal>

          {REST.map((testimonial, index) => (
            <Reveal key={testimonial.name} delay={index * 90}>
              <figure className="flex h-full flex-col justify-between gap-6 rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-shadow hover:shadow-md sm:p-7">
                <blockquote className="text-pretty text-[15px] leading-relaxed">
                  “{testimonial.quote}”
                </blockquote>
                <figcaption className="flex items-center justify-between gap-4 border-t border-border/60 pt-5">
                  <div className="flex items-center gap-3">
                    <Avatar testimonial={testimonial} />
                    <div>
                      <p className="text-sm font-semibold">{testimonial.name}</p>
                      <p className="text-[13px] text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                  {testimonial.metric ? (
                    <div className="shrink-0 text-right">
                      <p className="font-display text-lg leading-none text-ember-600 dark:text-ember-400">
                        {testimonial.metric.value}
                      </p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {testimonial.metric.label}
                      </p>
                    </div>
                  ) : null}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </Container>
    </Section>
  );
}