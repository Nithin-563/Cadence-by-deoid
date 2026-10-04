import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Page-width wrapper. `wide` is used for full-bleed bands (nav, footer),
 * everything else defaults to the comfortable reading column.
 */
export function Container({
  className,
  wide = false,
  ...props
}: React.ComponentProps<"div"> & { wide?: boolean }) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-5 sm:px-6 lg:px-8",
        wide ? "max-w-[88rem]" : "max-w-6xl",
        className,
      )}
      {...props}
    />
  );
}

/** Vertical rhythm wrapper for a page section. */
export function Section({
  className,
  id,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section id={id} className={cn("scroll-mt-24 py-20 sm:py-28", className)} {...props} />
  );
}

/**
 * Centered eyebrow + heading + lede block used to open each section.
 */
export function SectionHeading({
  className,
  eyebrow,
  title,
  lede,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  eyebrow?: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto flex max-w-2xl flex-col items-center gap-4 text-center",
        className,
      )}
      {...props}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-pretty text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-[2.75rem] md:leading-[1.08]">
        {title}
      </h2>
      {lede ? (
        <p className="max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
          {lede}
        </p>
      ) : null}
    </div>
  );
}

/** Small pill label used above section headings. */
export function Eyebrow({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase backdrop-blur",
        className,
      )}
      {...props}
    />
  );
}

/**
 * Fades content up as it scrolls into view. Falls back to visible content
 * when IntersectionObserver is unavailable (SSR, older browsers, tests).
 */
export function Reveal({
  className,
  delay = 0,
  ...props
}: React.ComponentProps<"div"> & { delay?: number }) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "motion-safe:transition-[opacity,transform] motion-safe:duration-700 motion-safe:ease-out",
        shown
          ? "motion-safe:translate-y-0 motion-safe:opacity-100"
          : "motion-safe:translate-y-4 motion-safe:opacity-0",
        className,
      )}
      style={{ transitionDelay: `${delay}ms` }}
      {...props}
    />
  );
}