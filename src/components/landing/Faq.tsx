import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";

const FAQS = [
  {
    q: "Where does the feedback actually come from?",
    a: "Anywhere your customers already talk. Cadence has native connectors for Zendesk, Intercom, Front, Gorgias, Gong, Zoom, Typeform, Delighted, Slack, Discord and Figma comments, plus a public JSON API and an inbound webhook for anything else. Import backfill is included on every plan.",
  },
  {
    q: "How is the AI scoring actually calculated?",
    a: "Each theme gets an impact score combining three signals: revenue attached to the accounts raising it, frequency and growth over time, and a strategic-fit weight you control per team. Scores are fully explainable — every number links back to the source items that produced it, so you can audit any ranking decision.",
  },
  {
    q: "Do you train models on our customer data?",
    a: "No. Your data is isolated per workspace, encrypted at rest with AES-256 and in transit with TLS 1.3, and is never used to train shared models. Enterprise plans can pin processing to the EU or US and enforce custom retention windows.",
  },
  {
    q: "Will this replace our roadmap tool?",
    a: "It usually doesn't — it feeds it. Cadence ranks and justifies what to build, then pushes the result into Linear, Jira, Asana, Productboard or a public roadmap. The moment a theme ships, we notify everyone who asked and publish it to your changelog.",
  },
  {
    q: "How long does implementation take?",
    a: "Connecting your first source takes about four minutes. Historical import of 90 days of feedback runs in the background and is usually searchable within the hour. Teams running their first roadmap review off Cadence data do so in week one.",
  },
  {
    q: "What happens when the trial ends?",
    a: "Nothing breaks. You drop to the free Community plan with one data source and 500 items a month, keep every insight you generated, and can upgrade whenever you like. We do not auto-charge and we do not hold your data hostage.",
  },
] as const;

export function Faq() {
  return (
    <Section id="faq">
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="Questions, answered"
            lede="Still unsure? Our team replies in under a business day — usually much faster."
          />
        </Reveal>

        <Reveal delay={80}>
          <Accordion type="single" collapsible className="mt-12 w-full">
            {FAQS.map((faq) => (
              <AccordionItem key={faq.q} value={faq.q}>
                <AccordionTrigger className="text-base hover:no-underline sm:text-lg">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Reveal>

        <Reveal delay={140}>
          <div className="mt-12 flex flex-col items-center gap-4 rounded-2xl border border-dashed bg-card/60 px-6 py-10 text-center">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Can’t find what you’re after?</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Talk to a human, or read the full docs.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button className="rounded-full">Contact sales</Button>
              <Button variant="outline" className="rounded-full">
                Read the docs
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}