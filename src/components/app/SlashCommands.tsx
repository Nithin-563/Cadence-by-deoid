import * as React from "react";
import { AlertTriangle, Ban, Check, Hash, Search, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Channel } from "@/lib/database.types";

export interface CommandResult {
  ok: boolean;
  message?: string;
}

/**
 * Client-side slash command context.
 */
interface SlashContext {
  channel: Channel | null;
  channelAllows: (permission: string) => boolean;
  onClear: () => void;
  onKick: (userId: string) => Promise<void>;
  onBan: (userId: string) => Promise<void>;
  onOpenProfileByName: (name: string) => Promise<void>;
  resolveMember: (query: string) => Promise<{ id: string; display_name: string } | null>;
}

interface CommandDef {
  name: string;
  args?: string;
  summary: string;
  danger?: boolean;
  run: (args: string, context: SlashContext) => Promise<CommandResult>;
}

const COMMANDS: CommandDef[] = [
  {
    name: "clear",
    summary: "Clear the message view (keeps history on the server)",
    danger: true,
    async run(_args, context) {
      context.onClear();
      return { ok: true, message: "Cleared this view. Reload to fetch history again." };
    },
  },
  {
    name: "topic",
    args: "<text>",
    summary: "Set this channel's topic (needs Manage channels)",
    danger: true,
    async run(args, context) {
      if (!context.channel) return { ok: false, message: "No channel selected." };
      if (!context.channelAllows("MANAGE_CHANNELS")) {
        return { ok: false, message: "You need Manage channels for that." };
      }
      if (!args) return { ok: false, message: "Usage: /topic <text>" };

      const { supabase } = await import("@/lib/supabase");
      const { error } = await supabase
        .from("channels")
        .update({ topic: args.slice(0, 256) })
        .eq("id", context.channel.id);
      return error
        ? { ok: false, message: error.message }
        : { ok: true, message: "Topic updated." };
    },
  },
  {
    name: "nick",
    args: "<name> <nickname>",
    summary: "Set your nickname in this server",
    async run(args, context) {
      if (!context.channel?.server_id) return { ok: false, message: "Not in a server." };
      const [username, ...rest] = args.split(/\s+/);
      const nickname = rest.join(" ").trim();
      if (!username || !nickname) return { ok: false, message: "Usage: /nick <username> <nickname>" };

      const { supabase } = await import("@/lib/supabase");
      const { data: person } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      const id = (person as { id: string } | null)?.id;
      if (!id) return { ok: false, message: `No member called @${username}.` };

      const { error } = await supabase
        .from("server_members")
        .update({ nickname: nickname.slice(0, 32) })
        .eq("server_id", context.channel.server_id)
        .eq("user_id", id);
      return error ? { ok: false, message: error.message } : { ok: true, message: "Nickname set." };
    },
  },
  {
    name: "kick",
    args: "<username>",
    summary: "Remove a member from this server",
    danger: true,
    async run(args, context) {
      if (!context.channel?.server_id) return { ok: false, message: "Not in a server." };
      const member = await context.resolveMember(args);
      if (!member) return { ok: false, message: `No member matched "${args}".` };
      await context.onKick(member.id);
      return { ok: true, message: `Kicked ${member.display_name}.` };
    },
  },
  {
    name: "ban",
    args: "<username>",
    summary: "Permanently ban a member from this server",
    danger: true,
    async run(args, context) {
      if (!context.channel?.server_id) return { ok: false, message: "Not in a server." };
      const member = await context.resolveMember(args);
      if (!member) return { ok: false, message: `No member matched "${args}".` };
      await context.onBan(member.id);
      return { ok: true, message: `Banned ${member.display_name}.` };
    },
  },
];

export function findCommand(name: string): CommandDef | undefined {
  const clean = name.replace(/^\//, "").toLowerCase();
  return COMMANDS.find((command) => command.name === clean);
}

/** Suggests commands matching what has been typed after a leading slash. */
export function useSlashSuggestions(value: string): CommandDef[] {
  return React.useMemo(() => {
    if (!value.startsWith("/") || value.includes(" ")) return [];
    const term = value.slice(1).toLowerCase();
    return COMMANDS.filter(
      (command) => command.name.startsWith(term) && command.name !== term,
    );
  }, [value]);
}

/** Inline palette rendered above the composer while typing a command. */
export function SlashPalette({
  commands,
  activeIndex,
}: {
  commands: CommandDef[];
  activeIndex: number;
}) {
  if (commands.length === 0) return null;

  return (
    <div className="absolute bottom-full left-3 z-30 mb-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border bg-card shadow-xl sm:left-4">
      <p className="border-b px-3 py-1.5 text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
        Commands
      </p>
      <ul className="max-h-56 overflow-y-auto p-1">
        {commands.map((command, index) => (
          <li key={command.name}>
            <div
              className={cn(
                "flex items-start gap-2 rounded-lg px-2 py-1.5",
                index === activeIndex && "bg-accent",
              )}
            >
              {command.danger ? (
                <Ban className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              ) : (
                <Hash className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-[13px] font-medium">
                  /{command.name}
                  {command.args ? (
                    <span className="ml-1 font-normal text-muted-foreground">{command.args}</span>
                  ) : null}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{command.summary}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Result toast shown after a command runs. */
export function CommandFeedback({
  result,
  onDismiss,
}: {
  result: CommandResult;
  onDismiss: () => void;
}) {
  React.useEffect(() => {
    const timer = window.setTimeout(onDismiss, 4000);
    return () => window.clearTimeout(timer);
  }, [result, onDismiss]);

  if (!result.message) return null;

  return (
    <div
      role="status"
      className={cn(
        "mx-3 mb-2 flex items-start gap-2 rounded-lg border px-3 py-2 text-sm sm:mx-4",
        result.ok
          ? "border-teal/40 bg-teal-soft text-teal"
          : "border-destructive/40 bg-destructive/10 text-foreground/85",
      )}
    >
      {result.ok ? (
        <Check className="mt-0.5 size-4 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
      )}
      <span className="min-w-0 flex-1">{result.message}</span>
    </div>
  );
}

export { COMMANDS };