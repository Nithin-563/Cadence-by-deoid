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
    title: "Cadence — Servers, channels and DMs for your community",
    description:
      "Cadence is a Discord-style chat app with servers, channels, roles, granular permissions and DMs. Realtime messaging powered by Supabase, free and self-hostable.",
    ogTitle: "Cadence — Servers, channels and DMs for your community",
    ogDescription:
      "A Discord-style chat app with servers, channels, roles, permissions and DMs. Realtime on Supabase, free to run.",
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