import { MessageSquareQuote, Sparkles, TrendingUp } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Hand-rolled product mockup rendered entirely in SVG/CSS so the hero stays
 * crisp at any resolution and costs nothing to download.
 */
export function DashboardMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-foreground/8",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-4 py-3">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-ember-300" />
          <span className="size-2.5 rounded-full bg-gold-300" />
          <span className="size-2.5 rounded-full bg-teal/50 dark:bg-teal" />
        </div>
        <div className="ml-2 hidden flex-1 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-1 sm:flex">
          <span className="truncate text-[11px] text-muted-foreground">
            app.cadence.so/insights/overview
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr]">
        {/* Icon rail */}
        <div className="hidden flex-col items-center gap-4 border-r border-border/70 bg-muted/30 py-5 pr-4 pl-4 sm:flex">
          <div className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-ember-500 to-gold-400">
            <div className="flex h-3 items-end gap-[2px]">
              <span className="h-1 w-[2px] rounded-full bg-white/90" />
              <span className="h-2 w-[2px] rounded-full bg-white/90" />
              <span className="h-3 w-[2px] rounded-full bg-white" />
            </div>
          </div>
          {["themes", "inbox", "roadmap", "insights"].map((label, index) => (
            <div
              key={label}
              title={label}
              className={cn(
                "size-8 rounded-lg",
                index === 0 ? "bg-ember-500/12 ring-1 ring-ember-500/30" : "bg-foreground/6",
              )}
            />
          ))}
        </div>

        {/* Panel */}
        <div className="min-w-0 p-4 sm:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
                Feedback volume
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-display text-3xl leading-none sm:text-4xl">4,182</span>
                <span className="inline-flex items-center gap-0.5 rounded-full bg-teal-soft px-1.5 py-0.5 text-[11px] font-medium text-teal">
                  <TrendingUp className="size-3" />
                  28%
                </span>
              </div>
            </div>
            <div className="flex gap-1.5" aria-hidden="true">
              {["7d", "30d", "90d"].map((range) => (
                <span
                  key={range}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium",
                    range === "30d"
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {range}
                </span>
              ))}
            </div>
          </div>

          {/* Area chart */}
          <div className="mt-5">
            <VolumeChart />
          </div>

          {/* Themes */}
          <div className="mt-6 grid gap-2.5">
            <ThemeRow
              label="Bulk export to CSV"
              mentions={612}
              sentiment={86}
              growth="+41%"
            />
            <ThemeRow label="Dark mode everywhere" mentions={488} sentiment={72} growth="+33%" />
            <ThemeRow label="SSO & SCIM" mentions={271} sentiment={64} growth="+12%" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Smooth two-series area chart drawn with plain SVG paths. */
function VolumeChart() {
  return (
    <div className="relative">
      <svg
        viewBox="0 0 480 130"
        preserveAspectRatio="none"
        className="h-28 w-full sm:h-32"
        role="img"
        aria-label="Feedback volume trending up over the last 30 days"
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--ember-400)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--ember-400)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chart-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--ember-500)" />
            <stop offset="100%" stopColor="var(--gold-400)" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3].map((row) => (
          <line
            key={row}
            x1="0"
            x2="480"
            y1={12 + row * 34}
            y2={12 + row * 34}
            stroke="var(--border)"
            strokeWidth="1"
            strokeDasharray="3 5"
          />
        ))}

        <path d="M0,104 L40,96 L80,99 L120,82 L160,86 L200,68 L240,72 L280,54 L320,58 L360,40 L400,44 L440,26 L480,20 L480,130 L0,130 Z" fill="url(#chart-fill)" />
        <path
          d="M0,104 L40,96 L80,99 L120,82 L160,86 L200,68 L240,72 L280,54 L320,58 L360,40 L400,44 L440,26 L480,20"
          fill="none"
          stroke="url(#chart-line)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle cx="480" cy="20" r="4" fill="var(--gold-400)" />
      </svg>
    </div>
  );
}

function ThemeRow({
  label,
  mentions,
  sentiment,
  growth,
}: {
  label: string;
  mentions: number;
  sentiment: number;
  growth: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-ember-500/12 text-ember-600 dark:text-ember-400">
        <MessageSquareQuote className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium">{label}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-foreground/10">
            <div
              className="h-full rounded-full bg-linear-to-r from-ember-500 to-gold-400"
              style={{ width: `${sentiment}%` }}
            />
          </div>
          <span className="text-[11px] tabular-nums text-muted-foreground">{sentiment}%</span>
        </div>
      </div>
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-[13px] font-medium tabular-nums">{mentions}</p>
        <p className="text-[11px] font-medium text-teal">{growth}</p>
      </div>
    </div>
  );
}

/** Floating AI summary card that overlaps the dashboard. */
export function AiSummaryCard({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "motion-safe:animate-float rounded-xl border border-border/80 bg-card/95 p-4 shadow-xl shadow-foreground/10 backdrop-blur-xl",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-linear-to-br from-ember-500 to-gold-400">
          <Sparkles className="size-3.5 text-white" />
        </span>
        <p className="text-xs font-semibold">Cadence AI summary</p>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
        Exports account for <span className="font-medium text-foreground">14.6% of ARR</span> at risk
        this quarter, driven by 3 enterprise accounts.
      </p>
      <div className="mt-3 flex items-center gap-1.5">
        <span className="rounded-full bg-ember-500/12 px-2 py-0.5 text-[11px] font-medium text-ember-700 dark:text-ember-300">
          P0 · Revenue
        </span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
          Draft created
        </span>
      </div>
    </div>
  );
}