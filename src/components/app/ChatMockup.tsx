import { Hash, Search, Send, Smile, Bell, Headphones, Mic, Plus, Settings2 } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A miniature of the real Cadence client, built in plain markup so the landing
 * page shows the actual product rather than a stock illustration.
 */
export function ChatMockup({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-foreground/8",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-ember-300" />
          <span className="size-2.5 rounded-full bg-gold-300" />
          <span className="size-2.5 rounded-full bg-teal/60 dark:bg-teal" />
        </div>
        <div className="ml-2 hidden flex-1 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-1 sm:flex">
          <Search className="size-3 text-muted-foreground" />
          <span className="truncate text-[11px] text-muted-foreground">
            Search Cadence — jump to a channel or a person
          </span>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] lg:grid-cols-[auto_12rem_1fr]">
        {/* Server rail */}
        <div className="flex w-11 flex-col items-center gap-2 border-r border-border/70 bg-muted/40 py-3">
          <span className="flex size-7 items-center justify-center rounded-[28%] bg-foreground/10">
            <HomeGlyph />
          </span>
          {["#f97316", "#8b5cf6", "#0ea5e9", "#22c55e"].map((color, index) => (
            <span
              key={color}
              className={cn(
                "size-7 rounded-[28%] bg-linear-to-br to-transparent",
                index === 1 && "ring-2 ring-foreground/80",
              )}
              style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${color}55)` }}
            />
          ))}
          <span className="mt-auto flex size-7 items-center justify-center rounded-[28%] bg-foreground/8 text-muted-foreground">
            <Plus className="size-3.5" />
          </span>
        </div>

        {/* Channel sidebar */}
        <div className="hidden flex-col border-r border-border/70 bg-muted/20 lg:flex">
          <div className="flex h-9 items-center justify-between border-b border-border/70 px-3">
            <span className="truncate text-xs font-semibold">Design Guild</span>
            <Settings2 className="size-3.5 text-muted-foreground" />
          </div>

          <div className="flex-1 space-y-3 p-2">
            <Group label="Text channels" active="general">
              <Hash className="size-3.5" />
            </Group>
            <Group label="announcements" />
            <Group label="design-review" />
            <Group label="random" />

            <p className="px-2 pt-2 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
              Voice — empty
            </p>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 rounded px-2 py-1 text-xs text-muted-foreground">
                <Headphones className="size-3.5 opacity-50" />
                Lounge
                <Mic className="ml-auto size-3 opacity-40" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-border/70 px-2 py-2">
            <span className="relative flex size-6 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal to-ember-400 text-[9px] font-semibold text-white">
              PR
              <span className="absolute -right-0.5 -bottom-0.5 size-2 rounded-full bg-emerald-500 ring-2 ring-card" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[11px] font-medium">Priya R.</span>
            <Bell className="size-3 text-muted-foreground" />
          </div>
        </div>

        {/* Chat */}
        <div className="flex min-w-0 flex-col">
          <div className="flex h-9 items-center gap-1.5 border-b border-border/70 px-3 text-xs">
            <Hash className="size-3.5 text-muted-foreground" />
            <span className="font-semibold">general</span>
            <span className="ml-1 hidden truncate border-l border-border pl-2 text-muted-foreground sm:inline">
              Where the guild hangs out
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-hidden p-3">
            <Day label="Today" />

            <Row
              initials="MA"
              tone="from-gold-400 to-ember-500"
              name="Marcus Adeyemi"
              time="09:41"
              body={
                <>
                  Morning all — pushing the new nav to staging in 10.{" "}
                  <Chip tone="bg-ember-500/15 text-ember-700 dark:text-ember-300">#design-review</Chip>
                </>
              }
            />
            <Row
              initials="SL"
              tone="from-teal to-gold-400"
              name="Sofia Lindqvist"
              time="09:43"
              body={
                <>
                  Looks great. One nit — can we bump the contrast on the muted text? It fails WCAG AA
                  on the dark surface.
                </>
              }
              reactions={[
                { emoji: "👀", count: 3, mine: true },
                { emoji: "👍", count: 2 },
              ]}
            />
            <Row
              initials="TH"
              tone="from-ember-600 to-teal"
              name="Tomás Herrera"
              time="09:45"
              body={
                <>
                  Done — bumped it from 3.9:1 to 5.2:1.{" "}
                  <span className="text-[10px] text-muted-foreground">edited</span>
                </>
              }
            />

            <div className="flex items-center gap-2 pt-1 text-[11px] text-teal">
              <span className="relative flex size-4 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-teal to-gold-400 text-[7px] font-semibold text-white">
                PR
              </span>
              Priya is typing…
            </div>
          </div>

          {/* Composer */}
          <div className="px-3 pb-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
              <Plus className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex-1 truncate text-[13px] text-muted-foreground">
                Message #general
              </span>
              <Smile className="size-4 shrink-0 text-muted-foreground" />
              <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-ember-500 text-white">
                <Send className="size-3" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Group({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded px-2 py-1 text-xs transition-colors",
        active
          ? "bg-foreground/10 font-medium text-foreground"
          : "text-muted-foreground",
      )}
    >
      {children}
      <span className="truncate">{label}</span>
    </div>
  );
}

function Day({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-px flex-1 bg-border" />
      <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function Chip({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <span className={cn("rounded px-1 py-0.5 text-[11px] font-medium", tone)}>{children}</span>;
}

function Row({
  initials,
  tone,
  name,
  time,
  body,
  reactions,
}: {
  initials: string;
  tone: string;
  name: string;
  time: string;
  body: React.ReactNode;
  reactions?: { emoji: string; count: number; mine?: boolean }[];
}) {
  return (
    <div className="flex gap-2.5">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[10px] font-semibold text-white",
          tone,
        )}
      >
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold">{name}</span>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-[13px] leading-relaxed break-words">{body}</p>
        {reactions ? (
          <div className="mt-1.5 flex gap-1.5">
            {reactions.map((reaction) => (
              <span
                key={reaction.emoji}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px]",
                  reaction.mine
                    ? "border-ember-500/50 bg-ember-500/12"
                    : "border-border bg-background/60",
                )}
              >
                {reaction.emoji}
                <span className="font-medium tabular-nums">{reaction.count}</span>
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}