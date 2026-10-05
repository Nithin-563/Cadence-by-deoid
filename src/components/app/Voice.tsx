import * as React from "react";
import {
  Headphones,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Plus,
  Radio,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MAX_MESH_PEERS, type VoiceState } from "@/hooks/useVoice";
import type { VoiceOccupant } from "@/hooks/useVoiceChannels";
import type { VoiceChannel } from "@/lib/database.types";
import type { Profile } from "@/lib/database.types";

/* ------------------------------------------------------ channel listing --- */

export function VoiceChannelList({
  channels,
  occupants,
  profiles,
  activeVoiceChannelId,
  canManage,
  schemaMissing = false,
  onJoin,
  onCreate,
  onRename,
  onDelete,
}: {
  channels: VoiceChannel[];
  occupants: Record<string, VoiceOccupant[]>;
  profiles: Map<string, Profile>;
  activeVoiceChannelId: string | null;
  canManage: boolean;
  schemaMissing?: boolean;
  onJoin: (channel: VoiceChannel) => void;
  onCreate: () => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");

  if (channels.length === 0 && !creating) {
    return (
      <section>
        <div className="mb-1 flex items-center justify-between px-2">
          <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Voice channels
          </h2>
          {canManage && !schemaMissing ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              aria-label="Create voice channel"
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Plus className="size-4" />
            </button>
          ) : null}
        </div>

        {schemaMissing ? (
          <p className="rounded-lg border border-dashed px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">
            Voice isn&rsquo;t set up on this Supabase project yet. Run the voice section of{" "}
            <span className="font-mono">supabase/schema.sql</span> to enable it.
          </p>
        ) : (
          <>
            <p className="px-2 text-[13px] text-muted-foreground">
              No voice channels yet.
              {canManage ? " Create one to start talking." : ""}
            </p>
            {canManage ? (
              <CreateRow
                name={name}
                setName={setName}
                onCreate={onCreate}
                onCancel={() => setCreating(false)}
              />
            ) : null}
          </>
        )}
      </section>
    );
  }

  return (
    <section>
      <div className="mb-1 flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          Voice channels
        </h2>
        {canManage ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="Create voice channel"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Plus className="size-4" />
          </button>
        ) : null}
      </div>

      {creating ? (
        <CreateRow
          name={name}
          setName={setName}
          onCreate={() => {
            onCreate();
            setName("");
            setCreating(false);
          }}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      <ul className="space-y-0.5">
        {channels.map((channel) => {
          const people = occupants[channel.id] ?? [];
          const active = channel.id === activeVoiceChannelId;
          const full = channel.user_limit !== null && people.length >= channel.user_limit;

          return (
            <li key={channel.id}>
              <div className="group/voice flex items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-foreground/5">
                <button
                  type="button"
                  onClick={() => onJoin(channel)}
                  aria-pressed={active}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 rounded text-left text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    active
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {active ? (
                    <Radio className="size-4 shrink-0 animate-pulse motion-reduce:animate-none" />
                  ) : (
                    <Headphones className="size-4 shrink-0 opacity-60" />
                  )}
                  <span className="truncate">{channel.name}</span>
                  {people.length > 0 ? (
                    <span className="shrink-0 text-[11px] tabular-nums opacity-70">
                      {people.length}
                    </span>
                  ) : null}
                  {full ? (
                    <span className="shrink-0 text-[10px] text-destructive">full</span>
                  ) : null}
                </button>

                {canManage ? (
                  <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover/voice:opacity-100">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Rename ${channel.name}`}
                      onClick={() => {
                        const next = window.prompt("Voice channel name", channel.name);
                        if (next && next.trim() && next.trim() !== channel.name) {
                          onRename(channel.id, next.trim().slice(0, 64));
                        }
                      }}
                    >
                      <span className="text-[10px] font-bold">Aa</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Delete ${channel.name}`}
                      onClick={() => onDelete(channel.id)}
                    >
                      <X className="size-3.5 text-destructive" />
                    </Button>
                  </span>
                ) : null}
              </div>

              {people.length > 0 ? (
                <ul className="mb-1 ml-6 space-y-0.5 border-l border-border/70 pl-2">
                  {people.map((person) => {
                    const profile = profiles.get(person.userId);
                    return (
                      <li key={`${channel.id}-${person.sessionId}`} className="flex items-center gap-1.5 py-0.5">
                        <Avatar
                          seed={person.userId}
                          name={profile?.display_name ?? "Member"}
                          src={profile?.avatar_url}
                          size={18}
                        />
                        <span className="truncate text-[12px] text-muted-foreground">
                          {profile?.display_name ?? "Member"}
                        </span>
                        {person.muted ? (
                          <MicOff className="ml-auto size-3 shrink-0 text-destructive/80" />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CreateRow({
  name,
  setName,
  onCreate,
  onCancel,
}: {
  name: string;
  setName: (value: string) => void;
  onCreate: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1.5 flex gap-1.5 px-2">
      <Input
        value={name}
        autoFocus
        placeholder="General voice"
        maxLength={64}
        aria-label="Voice channel name"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && name.trim()) onCreate();
          if (event.key === "Escape") onCancel();
        }}
        className="h-8 text-sm"
      />
      <Button
        size="sm"
        className="h-8 shrink-0 rounded-md px-2.5"
        disabled={!name.trim()}
        onClick={onCreate}
      >
        Add
      </Button>
      <Button size="sm" variant="ghost" className="h-8 shrink-0 px-2" onClick={onCancel}>
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- stage --- */

/** Persistent panel shown while connected to a voice channel. */
export function VoiceStage({
  voice,
  profiles,
  myUserId,
  onClose,
}: {
  voice: VoiceState;
  profiles: Map<string, Profile>;
  myUserId: string;
  onClose: () => void;
}) {
  if (voice.status !== "connected") return null;

  const others = voice.participants.filter((participant) => !participant.isSelf);
  const overMeshLimit = others.length > MAX_MESH_PEERS - 1;

  return (
    <div className="border-t border-border/70 bg-muted/40">
      {/* Status + controls */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 sm:px-4">
        <span className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          <Radio className="size-4 animate-pulse motion-reduce:animate-none" />
          Voice connected
        </span>
        <span className="text-[11px] text-muted-foreground">
          {others.length + 1}/{MAX_MESH_PEERS} in call
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            variant={voice.muted ? "destructive" : "secondary"}
            size="icon-sm"
            aria-label={voice.muted ? "Unmute microphone" : "Mute microphone"}
            aria-pressed={voice.muted}
            onClick={voice.toggleMute}
          >
            {voice.muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
          </Button>

          <Button
            variant={voice.deafened ? "destructive" : "secondary"}
            size="icon-sm"
            aria-label={voice.deafened ? "Undeafen" : "Deafen"}
            aria-pressed={voice.deafened}
            onClick={voice.toggleDeafen}
          >
            {voice.deafened ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>

          <Button
            variant={voice.sharingScreen ? "default" : "secondary"}
            size="icon-sm"
            aria-label={voice.sharingScreen ? "Stop sharing screen" : "Share screen"}
            aria-pressed={voice.sharingScreen}
            onClick={() => void voice.toggleScreenShare()}
          >
            <MonitorUp className="size-4" />
          </Button>

          <Button variant="destructive" size="sm" className="rounded-full" onClick={onClose}>
            <PhoneOff className="size-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </Button>
        </div>
      </div>

      {/* Local screen share preview */}
      {voice.sharingScreen && voice.screenStream ? (
        <div className="px-3 pb-2 sm:px-4">
          <video
            srcObject={voice.screenStream}
            autoPlay
            muted
            playsInline
            className="w-full max-h-64 rounded-lg border bg-black"
          />
        </div>
      ) : null}

      {/* Participants */}
      <ul className="flex flex-wrap gap-2 px-3 pb-3 sm:px-4">
        {voice.participants.map((participant) => {
          const isSelf = participant.isSelf;
          const profile = isSelf ? null : (profiles.get(participant.userId) ?? null);
          const name = isSelf ? "You" : (profile?.display_name ?? "Member");
          const share = isSelf ? voice.screenStream : voice.screenStreams[participant.userId];

          return (
            <li
              key={participant.isSelf ? "me" : participant.userId}
              className={cn(
                "relative flex size-14 items-center justify-center rounded-full ring-2 transition-all",
                participant.speaking
                  ? "ring-emerald-500 ring-offset-2 ring-offset-muted"
                  : "ring-transparent",
              )}
            >
              <Avatar
                seed={isSelf ? myUserId : participant.userId}
                name={name}
                src={profile?.avatar_url}
                size={56}
              />
              <span
                className={cn(
                  "absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full ring-2 ring-muted",
                  participant.muted ? "bg-destructive text-white" : "bg-emerald-500 text-white",
                )}
              >
                {participant.muted ? (
                  <MicOff className="size-2.5" />
                ) : (
                  <Mic className="size-2.5" />
                )}
              </span>
              <span className="absolute -bottom-4 left-1/2 max-w-16 -translate-x-1/2 truncate text-[10px] text-muted-foreground">
                {name}
              </span>
              {share ? (
                <video
                  srcObject={share}
                  autoPlay
                  muted
                  playsInline
                  className="sr-only"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ul>

      {overMeshLimit ? (
        <p className="px-3 pb-3 text-[11px] text-amber-600 dark:text-amber-400 sm:px-4">
          {others.length + 1} people are connected. Voice is peer-to-peer, so quality drops past{" "}
          {MAX_MESH_PEERS} — consider splitting into another channel.
        </p>
      ) : null}
    </div>
  );
}

/** Big centred warning when the mic can't be opened. */
export function VoiceError({ message, onRetry, onDismiss }: { message: string; onRetry: () => void; onDismiss: () => void }) {
  return (
    <div className="border-t border-destructive/40 bg-destructive/10 px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <MicOff className="size-4 shrink-0 text-destructive" />
        <p className="min-w-40 flex-1 text-sm text-foreground/85">{message}</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={onRetry}>
          Try again
        </Button>
        <Button size="sm" variant="ghost" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}
