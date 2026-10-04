import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { Container, Reveal } from "@/components/landing/primitives";
import { Logo } from "@/components/landing/Logo";

export function FinalCta() {
  return (
    <section className="px-5 pb-20 sm:px-6 sm:pb-28 lg:px-8">
      <Container wide>
        <Reveal>
          <div className="relative isolate overflow-hidden rounded-3xl bg-panel px-6 py-16 text-center text-panel-foreground sm:px-12 sm:py-24">
            {/* Gradient bloom */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--ember-500),transparent)] opacity-55 blur-3xl" />
              <div className="absolute -right-24 -bottom-32 size-[30rem] rounded-full bg-[radial-gradient(closest-side,var(--gold-400),transparent)] opacity-40 blur-3xl" />
              <div className="absolute inset-0 opacity-[0.14] [background-image:linear-gradient(var(--panel-foreground)_1px,transparent_1px),linear-gradient(90deg,var(--panel-foreground)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000,transparent)]" />
            </div>

            <h2 className="mx-auto max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl md:text-[3.5rem] md:leading-[1.05]">
              Your customers already told you what to build.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-panel-foreground/70 sm:text-lg">
              Connect one source, see your ranked backlog in an hour, and never argue about whose
              anecdote wins again.
            </p>

            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/app"
                className="group inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-panel-foreground px-7 text-base font-medium whitespace-nowrap text-panel transition-colors hover:bg-panel-foreground/90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto"
              >
                Open Cadence
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-panel-foreground/30 px-7 text-base font-medium whitespace-nowrap text-panel-foreground transition-colors hover:bg-panel-foreground/10 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:w-auto"
              >
                Create an account
              </Link>
            </div>

            <p className="mt-6 text-sm text-panel-foreground/55">
              Free 14-day trial · No credit card · Cancel in one click
            </p>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: ["Features", "Integrations", "Changelog", "Roadmap", "Pricing"],
  },
  {
    title: "Company",
    links: ["About", "Customers", "Careers", "Blog", "Press kit"],
  },
  {
    title: "Resources",
    links: ["Documentation", "API reference", "Help centre", "Status", "Community"],
  },
  {
    title: "Legal",
    links: ["Privacy", "Terms", "Security", "DPA", "Subprocessors"],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-muted/40">
      <Container wide className="py-14 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(0,1fr))]">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-4 text-pretty text-sm leading-relaxed text-muted-foreground">
              The customer intelligence platform for teams that would rather ship the right thing
              than the loudest thing.
            </p>
            <div className="mt-6 flex items-center gap-2">
              {[
                { label: "X", d: "M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.9H5.5L17.8 20Z" },
                { label: "GitHub", d: "M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.5 9.5 0 0 1 12 6.8c.85 0 1.71.12 2.51.34 1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.85-2.34 4.7-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" },
                { label: "LinkedIn", d: "M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.06c.53-1 1.83-2.05 3.77-2.05 4.03 0 4.77 2.65 4.77 6.1V21h-4v-5.5c0-1.31-.02-3-1.83-3-1.83 0-2.11 1.43-2.11 2.9V21h-4V9Z" },
              ].map((social) => (
                <a
                  key={social.label}
                  href="#top"
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-full border border-border/70 bg-card text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <svg viewBox="0 0 24 24" className="size-4 fill-current" aria-hidden="true">
                    <path d={social.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-xs font-semibold tracking-[0.12em] uppercase">
                {column.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#top"
                      className="rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-8 sm:flex-row">
          <p className="text-[13px] text-muted-foreground">
            © {new Date().getFullYear()} Cadence Labs, Inc. All rights reserved.
          </p>
          <p className="text-[13px] text-muted-foreground">
            A demo landing page,{" "}
            <a
              href="https://deoid.diy"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded font-medium text-foreground underline decoration-ember-500/50 decoration-2 underline-offset-4 transition-colors hover:decoration-ember-500 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Vibed with Deoid
            </a>
          </p>
        </div>
      </Container>
    </footer>
  );
}