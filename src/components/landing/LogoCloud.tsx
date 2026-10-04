import { CustomerWordmark } from "@/components/landing/Logo";
import { Container, Reveal } from "@/components/landing/primitives";

const CUSTOMERS = [
  "Design Guild",
  "Open Source",
  "Game Night",
  "Meridian",
  "Kestrel",
  "Brightline",
  "Tidewater",
  "Northwind",
] as const;

const STRIP_CLASSES = "flex items-center gap-x-14 pr-14 sm:gap-x-20 sm:pr-20";

function LogoRow({ hidden }: { hidden?: boolean }) {
  return (
    <ul className={STRIP_CLASSES} aria-hidden={hidden ? true : undefined}>
      {CUSTOMERS.map((name) => (
        <li key={name}>
          <CustomerWordmark>{name}</CustomerWordmark>
        </li>
      ))}
    </ul>
  );
}

export function LogoCloud() {
  return (
    <section
      aria-labelledby="logo-cloud-heading"
      className="border-y border-border/60 bg-muted/40"
    >
      <Container wide className="py-14 sm:py-16">
        <Reveal>
          <h2
            id="logo-cloud-heading"
            className="text-center text-xs font-medium tracking-[0.14em] text-muted-foreground uppercase"
          >
            Trusted by communities of every size
          </h2>
        </Reveal>

        <div className="relative mt-9 overflow-hidden">
          {/* Edge fades so the marquee reads as one continuous strip */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-linear-to-r from-background to-transparent sm:w-32"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-linear-to-l from-background to-transparent sm:w-32"
          />

          {/* Two identical halves inside a translated wrapper keep the loop seamless. */}
          <div className="flex w-max motion-safe:animate-marquee motion-reduce:animate-none">
            <LogoRow />
            <LogoRow hidden />
          </div>
        </div>
      </Container>
    </section>
  );
}