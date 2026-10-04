import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  Hash,
  KeyRound,
  Lock,
  MessageCircle,
  MessagesSquare,
  Radio,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { Container, Reveal, Section, SectionHeading } from "@/components/landing/primitives";
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
    icon: MessagesSquare,
    title: "Servers for every kind of group",
    body: "Spin up a server in one click — you get #general and #random automatically, then add channels for whatever the group actually talks about.",
    span: "lg:col-span-3",
    visual: <ServersVisual />,
  },
  {
    icon: Shield,
    title: "Roles and real permissions",
    body: "Fifteen permission bits per role, resolved server-wide and then overridden per channel with allow/deny — exactly how Discord models it.",
    span: "lg:col-span-2",
    visual: <PermissionsVisual />,
  },
  {
    icon: Radio,
    title: "Realtime, actually realtime",
    body: "Messages land over a live WebSocket, not polling. Typing indicators, presence dots and reactions all stream the same way.",
    span: "lg:col-span-2",
    visual: <RealtimeVisual />,
  },
  {
    icon: MessageCircle,
    title: "Direct messages",
    body: "One-to-one DMs from any profile, the member list or the friend list. Blocking is enforced in the database, not just the UI.",
    span: "lg:col-span-2",
    visual: <DmVisual />,
  },
  {
    icon: Users,
    title: "Friends and a directory",
    body: "Search everyone by username or display name, send a request, and start talking. Nobody stays blank — every account gets a generated avatar.",
    span: "lg:col-span-3",
    visual: <DirectoryVisual />,
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
                Everything a chat app needs,{" "}
                <span className="font-display italic text-ember-600 dark:text-ember-400">
                  and nothing it doesn't
                </span>
              </>
            }
            lede="Cadence covers the core of Discord — servers, channels, roles, permissions, DMs and friends — and skips the clutter."
          />
        </Reveal>

        <div className="mt-14 grid gap-4 sm:mt-16 sm:gap-5 lg:grid-cols-5">
          {FEATURES.map((feature, index) => (
            <Reveal
              key={feature.title}
              delay={index * 70}
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
                  Make an account, create a server, share the invite link. Everything is realtime
                  from the first message.
                </p>
              </div>
              <LinkCta href="/login" label="Create an account" />
            </div>
          </Reveal>
        </div>
      </Container>
    </Section>
  );
}

/* ---------------------------------------------------------------- visuals */

function ServersVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
      <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
          Your servers
        </span>
        <span className="rounded-full bg-ember-500/12 px-2 py-0.5 text-[11px] font-medium text-ember-700 dark:text-ember-300">
          Owner
        </span>
      </div>
      <ul className="divide-y divide-border/60">
        {[
          { name: "Design Guild", desc: "Critique, specs and weekly demos", members: 42, color: "#f97316" },
          { name: "Open Source", desc: "Issues, releases and contributors", members: 128, color: "#8b5cf6" },
          { name: "Game Night", desc: "Thursdays at 8pm, bring snacks", members: 9, color: "#0ea5e9" },
        ].map((server) => (
          <li key={server.name} className="flex items-center gap-3 px-4 py-3">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-[28%] text-[11px] font-semibold text-white"
              style={{ backgroundImage: `linear-gradient(135deg, ${server.color}, ${server.color}66)` }}
            >
              {server.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{server.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{server.desc}</span>
            </span>
            <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {server.members}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const PERM_ROWS = [
  { label: "View channels", bit: "10" },
  { label: "Send messages", bit: "11" },
  { label: "Attach files", bit: "15" },
  { label: "Manage messages", bit: "13" },
  { label: "Manage channels", bit: "2" },
] as const;

function PermissionsVisual() {
  return (
    <ul className="space-y-2.5">
      {PERM_ROWS.map((row, index) => (
        <li
          key={row.label}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2"
        >
          <span
            className={cn(
              "flex size-6 shrink-0 items-center justify-center rounded-md",
              index < 2
                ? "bg-teal/18 text-teal"
                : index === 2
                  ? "bg-ember-500/15 text-ember-600 dark:text-ember-400"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {index < 2 ? (
              <Lock className="size-3" />
            ) : index === 2 ? (
              <KeyRound className="size-3" />
            ) : (
              <Shield className="size-3" />
            )}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13px]">{row.label}</span>
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
            bit {row.bit}
          </span>
        </li>
      ))}
      <li className="rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        Resolved in Postgres as <span className="font-mono">(base &amp; ~deny) | allow</span>
      </li>
    </ul>
  );
}

function RealtimeVisual() {
  return (
    <div className="rounded-xl border border-border/70 bg-background/60 p-4">
      <div className="flex items-center gap-2">
        <span className="relative flex size-2.5 shrink-0">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[13px] font-medium">Connected</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          wss://…/realtime/v1
        </span>
      </div>

      <ul className="mt-3 space-y-1.5 border-t border-border/60 pt-3">
        {[
          { event: "message.insert", tone: "text-ember-600 dark:text-ember-400" },
          { event: "typing.start", tone: "text-teal" },
          { event: "presence.sync", tone: "text-gold-600 dark:text-gold-400" },
          { event: "reaction.insert", tone: "text-muted-foreground" },
        ].map((row) => (
          <li key={row.event} className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-muted-foreground/60">›</span>
            <span className={row.tone}>{row.event}</span>
            <span className="ml-auto text-muted-foreground/60">&lt; 40 ms</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DmVisual() {
  return (
    <div className="space-y-2.5">
      {[
        { initials: "SL", name: "Sofia Lindqvist", preview: "pushed the fix 🎉", online: true, tone: "from-teal to-gold-400" },
        { initials: "TH", name: "Tomás Herrera", preview: "see you Thursday", online: false, tone: "from-ember-600 to-teal" },
      ].map((dm) => (
        <div
          key={dm.name}
          className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5"
        >
          <span className="relative shrink-0">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-full bg-linear-to-br text-[10px] font-semibold text-white",
                dm.tone,
              )}
            >
              {dm.initials}
            </span>
            <span
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card",
                dm.online ? "bg-emerald-500" : "bg-muted-foreground/50",
              )}
            />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{dm.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{dm.preview}</span>
          </span>
        </div>
      ))}
      <p className="flex items-center gap-1.5 rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground">
        <Lock className="size-3 shrink-0" /> Blocks are enforced by a row level security policy
      </p>
    </div>
  );
}

function DirectoryVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-border/70 bg-background/60">
      <div className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
        <Hash className="size-3 text-muted-foreground" />
        <span className="flex-1 text-[12px] text-muted-foreground">Search by username…</span>
      </div>
      <ul className="divide-y divide-border/60">
        {[
          { name: "Marcus Adeyemi", handle: "marcus", status: "Add friend" },
          { name: "Priya Raghunathan", handle: "priya", status: "Friends" },
          { name: "Tomás Herrera", handle: "tomas", status: "Message" },
        ].map((person) => (
          <li key={person.handle} className="flex items-center gap-3 px-4 py-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-ember-500 to-gold-400 text-[9px] font-semibold text-white">
              {person.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{person.name}</span>
              <span className="block truncate text-[11px] text-muted-foreground">
                @{person.handle}
              </span>
            </span>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                person.status === "Friends"
                  ? "bg-teal-soft text-teal"
                  : "bg-foreground/8 text-foreground",
              )}
            >
              {person.status}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-1.5 border-t border-border/60 px-4 py-2 text-[11px] text-muted-foreground">
        <UserPlus className="size-3 shrink-0" /> Send a request, or open a DM straight away
      </p>
    </div>
  );
}

export function LinkCta({ href, label }: { href: string; label: string }) {
  return (
    <Link
      to={href}
      className="group inline-flex items-center gap-1.5 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {label}
      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}