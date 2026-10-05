import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Bell,
  Hash,
  Image as ImageIcon,
  KeyRound,
  Lock,
  MessageCircle,
  MessagesSquare,
  Mic,
  Paperclip,
  Pin,
  Radio,
  Search,
  Shield,
  Smile,
  Upload,
  UserPlus,
  Users,
  Volume2,
} from "lucide-react";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
import { CapabilityGrid } from "@/components/landing/ProductShowcase";
import { cn } from "@/lib/utils";

type Feature = {
  icon: LucideIcon;
  title: string;
  body: string;
  visual?: ReactNode;
  span?: string;
};

const FEATURES: Feature[] = [
  {
    icon: Mic,
    title: "Voice that actually works",
    body: "Join a channel and you're in the call. Audio is peer-to-peer WebRTC, so there's no media server to run and no per-minute cost. Live speaking rings, mute, deafen and screen share are all built in.",
    span: "lg:col-span-3",
    visual: <VoiceVisual />,
  },
  {
    icon: Hash,
    title: "Text channels, properly ordered",
    body: "Topics, drag-free reordering, and unread badges that clear the moment you open a channel.",
    span: "lg:col-span-2",
    visual: <ChannelVisual />,
  },
  {
    icon: Shield,
    title: "Permissions you can reason about",
    body: "Fifteen permission bits per role, resolved server-wide and then overridden per channel with allow/deny — computed in SQL, so the database refuses what the UI hides.",
    span: "lg:col-span-2",
    visual: <PermissionsVisual />,
  },
  {
    icon: Upload,
    title: "Files and images inline",
    body: "Drag in an image or a PDF. It uploads to your Supabase Storage bucket and renders in the message.",
    span: "lg:col-span-2",
    visual: <AttachmentVisual />,
  },
  {
    icon: Bell,
    title: "Never lose the thread",
    body: "Unread counts per channel, a mention that shouts, pinned messages in a strip, and search that jumps you to the exact message.",
    span: "lg:col-span-2",
    visual: <AlertsVisual />,
  },
  {
    icon: Users,
    title: "The people side",
    body: "DMs, friend requests, a searchable directory, blocking, per-server nicknames and live online/idle/dnd presence.",
    span: "lg:col-span-2",
    visual: <PeopleVisual />,
  },
];

export function Features() {
  return (
    <Section id="features" className="relative">
      <Container wide>
        <Reveal>
          <SectionHeading
            eyebrow="The product"
            title={
              <>
                Everything you use Discord for,{" "}
                <span className="font-display italic text-ember-600 dark:text-ember-400">
                  on infrastructure you control
                </span>
              </>
            }
            lede="Cadence covers the parts people actually rely on daily — and leaves out the parts that are just clutter."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-5">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={index * 60}
              className={cn("min-w-0", feature.span ?? "lg:col-span-2")}
            >
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-md focus-within:border-border sm:p-7">
                <span className="inline-flex size-10 items-center justify-center rounded-xl bg-linear-to-br from-ember-500/15 to-gold-400/15 ring-1 ring-ember-500/20">
                  <feature.icon className="size-5 text-ember-600 dark:text-ember-400" />
                </span>
                <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
                {feature.visual ? <div className="mt-6 flex-1">{feature.visual}</div> : null}
              </article>
            </Reveal>
          ))}

          <Reveal delay={120} className="lg:col-span-5">
            <div className="flex flex-col items-start justify-between gap-5 overflow-hidden rounded-2xl border border-border/70 bg-linear-to-br from-ember-500/10 via-card to-gold-400/10 p-7 sm:flex-row sm:items-center sm:p-8">
              <div className="max-w-xl">
                <h3 className="text-xl font-semibold tracking-tight">
                  Your first server takes about four minutes
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Create a server, share the invite link, and you're talking. Voice, files and
                  permissions come with it.
                </p>
              </div>
              <Link
                to="/app"
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                Open Cadence
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/* ---------------------------------------------------------------- visuals */

function VoiceVisual() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-3 py-2.5">
        <span className="relative flex size-2 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
          Standup · voice connected
        </span>
        <span className="ml-auto flex gap-1">
          <span className="flex size-6 items-center justify-center rounded-lg bg-card/80 text-emerald-600 dark:text-emerald-400">
            <Mic className="size-3" />
          </span>
          <span className="flex size-6 items-center justify-center rounded-lg bg-card/80 text-muted-foreground">
            <Volume2 className="size-3" />
          </span>
        </span>
      </div>

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          { initials: "PR", tone: "from-ember-500 to-gold-400", speaking: true, muted: false },
          { initials: "MA", tone: "from-teal to-gold-400", speaking: false, muted: false },
          { initials: "SL", tone: "from-gold-400 to-ember-500", speaking: true, muted: false },
          { initials: "TH", tone: "from-ember-600 to-teal", speaking: false, muted: true },
        ].map((peer) => (
          <li
            key={peer.initials}
            className={cn(
              "relative flex items-center gap-2 rounded-lg border bg-background/60 px-2 py-2",
              peer.speaking && "border-emerald-500/50",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br text-[10px] font-semibold text-white ring-2 ring-background",
                peer.tone,
                peer.speaking && "ring-2 ring-emerald-500",
              )}
            >
              {peer.initials}
            </span>
            {peer.muted ? (
              <span className="ml-auto flex size-4 items-center justify-center rounded-full bg-destructive text-white">
                <Mic className="size-2" />
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <p className="rounded-lg border border-dashed px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        Peer-to-peer via WebRTC, with Supabase Realtime carrying only the signalling. Comfortable
        to about six people; beyond that you would want an SFU.
      </p>
    </div>
  );
}

function ChannelVisual() {
  return (
    <ul className="space-y-1.5">
      {[
        { name: "general", unread: 0, active: true },
        { name: "design-review", unread: 3, active: false },
        { name: "random", unread: 0, active: false },
        { name: "standup-notes", unread: 0, active: false },
      ].map((channel) => (
        <li key={channel.name}>
          <div
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px]",
              channel.active ? "bg-foreground/10 font-medium" : "bg-background/60",
            )}
          >
            <Hash
              className={cn(
                "size-3.5 shrink-0",
                channel.active ? "text-muted-foreground" : "text-muted-foreground/40",
              )}
            />
            <span className="truncate">{channel.name}</span>
            {channel.unread > 0 ? (
              <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] leading-4 font-bold text-primary-foreground">
                {channel.unread}
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

const BITS = [
  { label: "View channels", bit: 10, allowed: true },
  { label: "Send messages", bit: 11, allowed: true },
  { label: "Attach files", bit: 15, allowed: true },
  { label: "Manage messages", bit: 13, allowed: false },
  { label: "Manage channels", bit: 2, allowed: false },
] as const;

function PermissionsVisual() {
  return (
    <div>
      <ul className="space-y-1.5">
        {BITS.map((row) => (
          <li
            key={row.label}
            className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-2.5 py-1.5"
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                row.allowed
                  ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-destructive/20 text-destructive",
              )}
            >
              {row.allowed ? "✓" : "✕"}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
            <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
              bit {row.bit}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 rounded-lg border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Resolved in Postgres as{" "}
        <span className="font-mono">(base &amp; ~deny) | allow</span>
      </p>
    </div>
  );
}

function AttachmentVisual() {
  return (
    <div className="space-y-2.5">
      <div className="overflow-hidden rounded-xl border bg-background/60">
        <div className="flex items-center gap-2.5 border-b px-3 py-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-teal to-gold-400 text-[10px] font-semibold text-white">
            SL
          </span>
          <span className="text-[13px] font-semibold">Sofia</span>
        </div>
        <div className="p-3">
          <div className="grid h-24 place-items-center rounded-lg bg-linear-to-br from-teal/25 to-gold-400/25">
            <ImageIcon className="size-6 text-teal" />
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">palette-check.png · 248 KB</p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg border bg-background/60 px-3 py-2">
        <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 truncate text-[12px]">spec-v4.pdf</span>
        <span className="shrink-0 text-[11px] text-muted-foreground">1.2 MB</span>
      </div>
    </div>
  );
}

function AlertsVisual() {
  return (
    <ul className="space-y-2">
      {[
        { icon: Bell, text: "design-review — 3 unread", tone: "text-ember-600 dark:text-ember-400" },
        { icon: Users, text: "@you mentioned in general", tone: "text-primary" },
        { icon: Pin, text: "Standup agenda pinned", tone: "text-gold-600 dark:text-gold-400" },
        { icon: Search, text: "Jump to a search hit", tone: "text-teal" },
        { icon: Smile, text: "React, reply, edit, delete", tone: "text-muted-foreground" },
      ].map((row) => (
        <li key={row.text} className="flex items-center gap-2.5 rounded-lg border bg-background/60 px-3 py-2">
          <row.icon className={cn("size-3.5 shrink-0", row.tone)} />
          <span className="min-w-0 flex-1 truncate text-[12px]">{row.text}</span>
        </li>
      ))}
    </ul>
  );
}

function PeopleVisual() {
  return (
    <div className="overflow-hidden rounded-xl border bg-background/60">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <UserPlus className="size-3.5 text-muted-foreground" />
        <span className="flex-1 text-[12px] text-muted-foreground">Search the directory…</span>
      </div>
      <ul className="divide-y divide-border/60">
        {[
          { initials: "MA", name: "Marcus Adeyemi", handle: "marcus", tag: "Message", tone: "bg-foreground/8 text-foreground" },
          { initials: "PR", name: "Priya Raghunathan", handle: "priya", tag: "Friends", tone: "bg-teal-soft text-teal" },
          { initials: "TH", name: "Tomás Herrera", handle: "tomas", tag: "Add", tone: "bg-foreground/8 text-foreground" },
        ].map((person) => (
          <li key={person.handle} className="flex items-center gap-2.5 px-3 py-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-ember-500 to-gold-400 text-[10px] font-semibold text-white">
              {person.initials}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-medium">{person.name}</span>
              <span className="block truncate text-[10px] text-muted-foreground">
                @{person.handle}
              </span>
            </span>
            <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium", person.tone)}>
              {person.tag}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------- capability grid --- */

export const CAPABILITIES = [
  { icon: MessagesSquare, title: "Servers", body: "Unlimited, with an invite link you can regenerate." },
  { icon: Hash, title: "Text channels", body: "Topics, ordering, and unread badges." },
  { icon: Mic, title: "Voice channels", body: "Peer-to-peer WebRTC with screen share." },
  { icon: Shield, title: "Roles & permissions", body: "15 bits, plus per-channel allow/deny." },
  { icon: MessageCircle, title: "Direct messages", body: "One-to-one, with blocking enforced in SQL." },
  { icon: Pin, title: "Pins & search", body: "Pin key messages, search any channel." },
  { icon: Upload, title: "File sharing", body: "Images and documents to your Storage bucket." },
  { icon: KeyRound, title: "Row level security", body: "The database, not the UI, enforces access." },
] as const;
