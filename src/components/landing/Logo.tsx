import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Brand mark: four rounded strokes at varying heights — reads as both a
 * waveform and a rising signal. Tiled in an ember→gold gradient.
 */
export function LogoMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("size-8", className)}
      {...props}
    >
      <defs>
        <linearGradient id="cadence-mark" x1="2" y1="30" x2="30" y2="2" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--ember-600)" />
          <stop offset="0.55" stopColor="var(--ember-400)" />
          <stop offset="1" stopColor="var(--gold-400)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#cadence-mark)" />
      <g fill="#fff">
        <rect x="7.5" y="17.5" width="3.4" height="6" rx="1.7" />
        <rect x="13" y="13" width="3.4" height="10.5" rx="1.7" opacity="0.92" />
        <rect x="18.5" y="8.5" width="3.4" height="15" rx="1.7" opacity="0.96" />
        <rect x="24" y="4.5" width="3.4" height="19" rx="1.7" />
      </g>
    </svg>
  );
}

/** Full lockup: mark + wordmark. */
export function Logo({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)} {...props}>
      <LogoMark className="size-8 shrink-0" />
      <span className="text-[1.0625rem] leading-none font-semibold tracking-[-0.02em]">
        Cadence
      </span>
    </span>
  );
}

/**
 * Wordmark for the customer logo strip. Purely typographic so the row reads
 * as a set of real companies rather than mismatched clip art.
 */
export function CustomerWordmark({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "font-display text-xl tracking-tight whitespace-nowrap text-foreground/45 transition-colors hover:text-foreground/80 sm:text-2xl",
        className,
      )}
    >
      {children}
    </span>
  );
}