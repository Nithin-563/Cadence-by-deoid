import { Link } from "react-router-dom";

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
    q: "Is this really free, or is there a catch?",
    a: "No catch. Cadence is a client for your own Supabase project, so the only cost is whatever Supabase charges you — and their free tier handles most communities comfortably. There are no seats, no message caps and no feature gates.",
  },
  {
    q: "What backend does it actually use?",
    a: "Supabase, for everything. Auth is Supabase Auth, the data lives in Postgres, live updates use Supabase Realtime (a WebSocket plus broadcast and presence), avatars go to Storage, and Row Level Security enforces every permission in the database rather than trusting the client.",
  },
  {
    q: "How do the Discord-style permissions work?",
    a: "Every role is a bigint bitmask across 15 permissions. A member's base permissions are @everyone plus the union of their roles. Server owners and anyone with the Administrator bit get everything. On top of that, each channel can allow or deny specific bits per role or per person — resolved as (base & ~deny) | allow, in SQL.",
  },
  {
    q: "Do I need to run a server?",
    a: "No. There is no application server. The app is a static build that talks to Supabase from the browser, so it deploys to Netlify, Vercel or any static host. The security model depends on Row Level Security, not on a hidden backend.",
  },
  {
    q: "Can people impersonate others or read channels they can't see?",
    a: "No. Row Level Security is enabled on all fifteen tables. Messages, channels, reactions and reads are all filtered by channel_permission() in Postgres, which resolves the role bitmask and channel overwrites before returning a single row. Hiding something in the UI is never the thing protecting it.",
  },
  {
    q: "What about voice, video and threads?",
    a: "Not yet. Cadence covers servers, text channels, roles and permissions, DMs, friends, reactions, replies, presence and typing indicators. Voice and video channels are the obvious next step and the schema has room for them.",
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
            lede="Still stuck? The README walks through setup end to end, or open an issue on the repo."
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
              <h3 className="text-lg font-semibold tracking-tight">Ready to try it?</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Create an account and your first server takes about four minutes.
              </p>
            </div>
            <div className="flex flex-col gap-2.5 sm:flex-row">
              <Button asChild className="rounded-full">
                <Link to="/app">Open Cadence</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link to="/login">Create an account</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  );
}