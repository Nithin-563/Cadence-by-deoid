import { useSeoMeta } from "@unhead/react";

import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { LogoCloud } from "@/components/landing/LogoCloud";
import { Container, Reveal } from "@/components/landing/primitives";
import { Features, CAPABILITIES } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CapabilityGrid } from "@/components/landing/ProductShowcase";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Footer";

const Index = () => {
  useSeoMeta({
    title: "Cadence — Self-hosted chat with servers, voice and roles",
    description:
      "A Discord-style chat app with servers, text and voice channels, roles, granular permissions, DMs and file sharing. Runs on a Supabase project you own — free and self-hostable.",
    ogTitle: "Cadence — Self-hosted chat with servers, voice and roles",
    ogDescription:
      "Servers, text and voice channels, roles and permissions, DMs and file sharing — on infrastructure you control.",
    ogType: "website",
    twitterCard: "summary_large_image",
  });

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-full focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main">
        <Hero />
        <LogoCloud />

        <section className="border-b border-border/60 bg-muted/30 py-16 sm:py-20">
          <Container wide>
            <Reveal>
              <h2 className="text-center text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                Everything included
              </h2>
            </Reveal>
            <Reveal delay={80}>
              <div className="mt-8">
                <CapabilityGrid items={[...CAPABILITIES]} />
              </div>
            </Reveal>
          </Container>
        </section>

        <Features />
        <HowItWorks />
        <Testimonials />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
};

export default Index;