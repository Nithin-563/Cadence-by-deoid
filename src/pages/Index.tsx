import { useSeoMeta } from "@unhead/react";

import { Nav } from "@/components/landing/Nav";
import { Hero } from "@/components/landing/Hero";
import { LogoCloud } from "@/components/landing/LogoCloud";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Testimonials } from "@/components/landing/Testimonials";
import { Pricing } from "@/components/landing/Pricing";
import { Faq } from "@/components/landing/Faq";
import { FinalCta, Footer } from "@/components/landing/Footer";

const Index = () => {
  useSeoMeta({
    title: "Cadence — Stop guessing what to build next",
    description:
      "Cadence pulls customer feedback from support, calls, surveys and Slack, then turns it into prioritised, evidence-backed roadmap decisions your whole team can trust.",
    ogTitle: "Cadence — Stop guessing what to build next",
    ogDescription:
      "The customer intelligence platform for teams that would rather ship the right thing than the loudest thing.",
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