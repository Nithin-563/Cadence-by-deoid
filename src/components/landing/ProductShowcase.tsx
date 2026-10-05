import { MessageSquare, Mic, Shield, Upload, Users } from "lucide-react";
import { Link } from "react-router-dom";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";

const VOICE_PEERS = [
  { initials: "PR", tone: "from-ember-500 to-gold-400", speaking: true },
  { initials: "MA", tone: "from-teal to-gold-400", speaking: false },
  { initials: "SL", tone: "from-gold-400 to-ember-500", speaking: true },
  { initials: "TH", tone: "from-ember-600 to-teal", speaking: false },
] as const;

const VOICE_STATUS = [
  { icon: Mic, text: "Live microphone" },
  { icon: Users, text: "Speaking rings" },
  { icon: Shield, text: "No SFU needed" },
] as const;

/**
 * The hero showcase: the real three-pane client with a live voice call strip
 * beneath it, so the first thing a visitor sees is what the product does.
 */
export function ProductShowcase() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-6 -top-6 bottom-0 rounded-[2rem] bg-linear-to-b from-ember-500/12 to-transparent blur-2xl"
      />

      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl shadow-foreground/8">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-border/70 bg-muted/50 px-4 py-2.5">
          <div className="flex gap-1.5" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-ember-300" />
            <span className="size-2.5 rounded-full bg-gold-300" />
            <span className="size-2.5 rounded-full bg-teal/60 dark:bg-teal" />
          </div>
          <div className="ml-2 hidden flex-1 items-center gap-2 rounded-md border border-border/70 bg-background/70 px-3 py-1 sm:flex">
            <span className="truncate text-[11px] text-muted-foreground">app.cadence.so/app</span>
          </div>
        </div>

        <div className="grid grid-cols-[auto_1fr] lg:grid-cols-[auto_12.5rem_1fr]">
          {/* Rail */}
          <div className="flex w-11 flex-col items-center gap-2 border-r border-border/70 bg-muted/40 py-3">
            <span className="flex size-7 items-center justify-center rounded-[28%] bg-foreground/10 text-foreground">
              <MessageSquare className="size-3.5" />
            </span>
            {["#f97316", "#8b5cf6", "#0ea5e9"].map((color, index) => (
              <span
                key={color}
                className={cn(
                  "size-7 rounded-[28%]",
                  index === 0 && "ring-2 ring-foreground/80",
                )}
                style={{ backgroundImage: `linear-gradient(135deg, ${color}, ${color}55)` }}
              />
            ))}
          </div>

          {/* Channels */}
          <div className="hidden flex-col border-r border-border/70 bg-muted/20 lg:flex">
            <div className="flex h-9 items-center border-b border-border/70 px-3">
              <span className="truncate text-xs font-semibold">Design Guild</span>
            </div>

            <div className="flex-1 space-y-3 p-2">
              <div>
                <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Text channels
                </p>
                {[
                  { name: "general", unread: 3, active: true },
                  { name: "design-review", unread: 0 },
                  { name: "random", unread: 0 },
                ].map((channel) => (
                  <div
                    key={channel.name}
                    className={cn(
                      "flex items-center gap-1.5 rounded px-2 py-1 text-xs",
                      channel.active
                        ? "bg-foreground/10 font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    <span className="opacity-50">#</span>
                    <span className="truncate">{channel.name}</span>
                    {channel.unread > 0 ? (
                      <span className="ml-auto rounded-full bg-foreground/15 px-1.5 text-[9px] font-bold">
                        {channel.unread}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              <div>
                <p className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
                  Voice channels
                </p>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 rounded bg-emerald-500/12 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                    Standup
                    <span className="ml-auto text-[9px] tabular-nums opacity-70">4</span>
                  </div>
                  <div className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-muted-foreground">
                    <Mic className="size-3 opacity-50" />
                    Lounge
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Chat */}
          <div className="flex min-w-0 flex-col">
            <div className="flex h-9 items-center gap-1.5 border-b border-border/70 px-3 text-xs">
              <span className="opacity-50">#</span>
              <span className="font-semibold">general</span>
            </div>

            <div className="flex-1 space-y-2.5 overflow-hidden p-3">
              <Bubble
                initials="MA"
                tone="from-gold-400 to-ember-500"
                name="Marcus"
                text="New nav is on staging — screenshots in the pins."
              />
              <Bubble
                initials="SL"
                tone="from-teal to-gold-400"
                name="Sofia"
                text="Contrast is fixed, 5.2:1 now."
                attachment="palette-check.png"
              />
              <div className="flex items-center gap-2 pt-1 text-[11px] text-teal">
                <Avatar
                  seed="th"
                  name="Tomás Herrera"
                  size={16}
                  className="rounded-full"
                />
                Tomás is typing…
              </div>
            </div>

            {/* Live voice strip */}
            <div className="border-t border-border/70 bg-emerald-500/6 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 motion-reduce:animate-none" />
                  Voice connected
                </span>
                <span className="text-[10px] text-muted-foreground">Standup</span>

                <ul className="ml-auto flex items-center">
                  {VOICE_PEERS.map((peer, index) => (
                    <li key={peer.initials} className={cn(index > 0 && "-ml-1.5")}>
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full bg-linear-to-br text-[9px] font-semibold text-white ring-2 ring-card",
                          peer.tone,
                          peer.speaking && "ring-2 ring-emerald-500",
                        )}
                      >
                        {peer.initials}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Composer */}
            <div className="px-3 pb-3">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2">
                <Upload className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="flex-1 truncate text-[13px] text-muted-foreground">
                  Message #general
                </span>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-ember-500 text-white">
                  <MessageSquare className="size-3" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {VOICE_STATUS.map((entry) => (
          <li
            key={entry.text}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
          >
            <entry.icon className="size-3.5 text-teal" />
            {entry.text}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Bubble({
  initials,
  tone,
  name,
  text,
  attachment,
}: {
  initials: string;
  tone: string;
  name: string;
  text: string;
  attachment?: string;
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
        <span className="block text-[13px] font-semibold">{name}</span>
        <span className="block text-[13px] leading-relaxed text-muted-foreground">{text}</span>
        {attachment ? (
          <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border bg-background/60 px-2 py-1.5 text-[11px]">
            <span className="flex size-6 items-center justify-center rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Upload className="size-3" />
            </span>
            {attachment}
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Compact capability grid used in the feature section. */
export function CapabilityGrid({
  items,
}: {
  items: { icon: typeof Mic; title: string; body: string }[];
}) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.title} className="rounded-xl border bg-card p-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-linear-to-br from-ember-500/15 to-gold-400/15 ring-1 ring-ember-500/20">
            <item.icon className="size-4 text-ember-600 dark:text-ember-400" />
          </span>
          <p className="mt-3 text-sm font-semibold">{item.title}</p>
          <p className="mt-1 text-pretty text-[13px] leading-relaxed text-muted-foreground">
            {item.body}
          </p>
        </li>
      ))}
    </ul>
  );
}
