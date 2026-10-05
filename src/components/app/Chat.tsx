import * as React from "react";
import {
  CornerUpLeft,
  MoreHorizontal,
  Pencil,
  Pin,
  Reply,
  SmilePlus,
  Trash2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useMentionHighlight } from "@/hooks/useChatExtras";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Message, Profile, Reaction } from "@/lib/database.types";

const QUICK_EMOJI = ["👍", "❤️", "😂", "🎉", "👀", "🔥"] as const;

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatDayDivider(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

/* ------------------------------------------------------------- messages --- */

interface MessageItemProps {
  message: Message;
  author: Profile | null;
  replyTo: Message | null;
  replyAuthor: Profile | null;
  reactions: Reaction[];
  currentUserId: string;
  currentUsername?: string;
  canManage: boolean;
  showHeader: boolean;
  pinned?: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTogglePin: (message: Message) => void;
  onOpenProfile: (userId: string) => void;
}

export function MessageItem({
  message,
  author,
  replyTo,
  replyAuthor,
  reactions,
  currentUserId,
  currentUsername,
  canManage,
  showHeader,
  pinned,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onTogglePin,
  onOpenProfile,
}: MessageItemProps) {
  const grouped = reactions.reduce<Map<string, Reaction[]>>((map, reaction) => {
    const list = map.get(reaction.emoji) ?? [];
    list.push(reaction);
    map.set(reaction.emoji, list);
    return map;
  }, new Map());

  const name = author?.display_name ?? "Unknown member";
  const isMine = message.author_id === currentUserId;
  const segments = useMentionHighlight(message.content, currentUsername);

  return (
    <div
      className={cn(
        "group relative px-3 py-0.5 transition-colors hover:bg-foreground/[0.03] sm:px-4",
        showHeader && "mt-3",
        pinned && "bg-gold-400/8",
      )}
      id={message.id}
    >
      <div className="flex gap-2.5 sm:gap-3">
        <div className="w-8 shrink-0 sm:w-10">
          {showHeader ? (
            <button
              type="button"
              onClick={() => onOpenProfile(message.author_id)}
              className="rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
              aria-label={`View ${name}'s profile`}
            >
              <Avatar seed={message.author_id} name={name} src={author?.avatar_url} size={40} />
            </button>
          ) : null}
        </div>

        <div className="min-w-0 flex-1 pb-0.5">
          {showHeader ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <button
                type="button"
                onClick={() => onOpenProfile(message.author_id)}
                className="rounded text-[15px] font-semibold hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {name}
              </button>
              <time
                dateTime={message.created_at}
                className="text-[11px] text-muted-foreground"
                title={new Date(message.created_at).toLocaleString()}
              >
                {formatTime(message.created_at)}
              </time>
              {message.edited_at ? (
                <span className="text-[10px] text-muted-foreground/80">(edited)</span>
              ) : null}
              {pinned ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gold-600 dark:text-gold-400">
                  <Pin className="size-3" /> pinned
                </span>
              ) : null}
            </div>
          ) : null}

          {replyTo ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
              <CornerUpLeft className="size-3.5 shrink-0 opacity-70" />
              <span className="font-medium">{replyAuthor?.display_name ?? "Someone"}</span>
              <span className="truncate opacity-80">{replyTo.content}</span>
            </div>
          ) : null}

          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">
            {segments.map((segment, index) =>
              segment.mention ? (
                <span
                  key={index}
                  className="rounded bg-primary/15 px-0.5 font-medium text-foreground"
                >
                  {segment.text}
                </span>
              ) : (
                <span key={index}>{segment.text}</span>
              ),
            )}
          </p>

          {grouped.size > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {[...grouped.entries()].map(([emoji, list]) => {
                const mine = list.some((r) => r.user_id === currentUserId);
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => onReact(message.id, emoji)}
                    aria-pressed={mine}
                    title={list.map((r) => r.user_id).join(", ")}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      mine
                        ? "border-primary/50 bg-primary/12 text-foreground"
                        : "border-border bg-card hover:border-foreground/30",
                    )}
                  >
                    <span>{emoji}</span>
                    <span className="tabular-nums font-medium">{list.length}</span>
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      {/* Hover toolbar — hidden on touch, where it would fight with scrolling */}
      <div className="absolute -top-3 right-3 hidden items-center gap-0.5 rounded-md border border-border bg-card p-0.5 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover:opacity-100 sm:flex">
        <Button
          variant="ghost"
          size="icon-xs"
          title="React"
          aria-label="Add reaction"
          onClick={() => onReact(message.id, QUICK_EMOJI[0])}
        >
          <SmilePlus className="size-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          title="Reply"
          aria-label="Reply to message"
          onClick={() => onReply(message)}
        >
          <Reply className="size-3.5" />
        </Button>
        {(isMine || canManage) ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-xs" title="More" aria-label="More actions">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="flex gap-0.5 px-1 py-1">
                {QUICK_EMOJI.map((emoji) => (
                  <Button
                    key={emoji}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onReact(message.id, emoji)}
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              {isMine ? (
                <DropdownMenuItem onSelect={() => onEdit(message)}>
                  <Pencil className="size-4" /> Edit message
                </DropdownMenuItem>
              ) : null}
              {canManage ? (
                <DropdownMenuItem onSelect={() => onTogglePin(message)}>
                  <Pin className="size-4" /> {pinned ? "Unpin message" : "Pin message"}
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem variant="destructive" onSelect={() => onDelete(message)}>
                <Trash2 className="size-4" /> Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- composer --- */

export interface ComposerProps {
  disabled?: boolean;
  disabledReason?: string;
  /** Present when the user is replying to a message. */
  replyTo: { id: string; content: string; authorName: string } | null;
  /** Present when the user is editing one of their own messages. */
  editing: { id: string; content: string } | null;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  onSubmit: (content: string) => void | Promise<void>;
  onTyping: () => void;
}

const PALETTE = [
  "😀", "😂", "🥹", "😊", "😍", "🤔", "😴", "🤯",
  "👍", "👎", "🙌", "👏", "🔥", "🎉", "✅", "❌",
  "❤️", "💙", "💚", "💜", "💀", "👀", "🙏", "💯",
] as const;

export function Composer({
  disabled = false,
  disabledReason,
  replyTo,
  editing,
  onCancelReply,
  onCancelEdit,
  onSubmit,
  onTyping,
}: ComposerProps) {
  const [value, setValue] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const ref = React.useRef<HTMLTextAreaElement | null>(null);
  const isCoarsePointer = useCoarsePointer();

  // Seed the field with the text being edited.
  React.useEffect(() => {
    setValue(editing?.content ?? "");
  }, [editing]);

  // Refocus when a reply/edit context opens or closes.
  React.useEffect(() => {
    if (replyTo || editing) ref.current?.focus();
  }, [replyTo, editing]);

  const insertEmoji = (emoji: string) => {
    setValue((current) => `${current}${current && !/\s$/.test(current) ? " " : ""}${emoji} `);
    setEmojiOpen(false);
    ref.current?.focus();
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    void onSubmit(trimmed);
    setValue("");
  };

  if (disabled) {
    return (
      <div className="px-3 pb-4 sm:px-4 sm:pb-6">
        <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-center text-sm text-muted-foreground">
          {disabledReason ?? "You don't have permission to send messages here."}
        </div>
      </div>
    );
  }

  return (
    <div className="relative px-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pb-6">
      {emojiOpen ? (
        <>
          {/* Click-outside catcher */}
          <button
            type="button"
            aria-label="Close emoji picker"
            onClick={() => setEmojiOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute bottom-full left-4 z-20 mb-2 grid w-64 grid-cols-8 gap-1 rounded-xl border bg-card p-2 shadow-xl">
            {PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => insertEmoji(emoji)}
                aria-label={`Insert ${emoji}`}
                className="rounded p-1 text-lg transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : null}

      {editing ? (
        <div className="mb-1 flex items-center justify-between rounded-t-lg border border-b-0 bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
          <span>Editing message</span>
          <button type="button" onClick={onCancelEdit} className="font-medium hover:underline">
            Cancel
          </button>
        </div>
      ) : replyTo ? (
        <div className="mb-1 flex items-center justify-between rounded-t-lg border border-b-0 bg-muted/40 px-4 py-1.5 text-xs text-muted-foreground">
          <span className="truncate">Replying to {replyTo.authorName}</span>
          <button type="button" onClick={onCancelReply} className="font-medium hover:underline">
            Cancel
          </button>
        </div>
      ) : null}

      <div
        className={cn(
          "flex items-end gap-1 rounded-2xl border border-border bg-card px-2 py-1.5 shadow-sm sm:gap-2 sm:px-3 sm:py-2",
          "focus-within:border-foreground/30",
          (editing || replyTo) && "rounded-t-none",
        )}
      >
        <Button
          variant="ghost"
          size="icon"
          aria-label="Insert emoji"
          aria-expanded={emojiOpen}
          className="mb-0.5 shrink-0"
          onClick={() => setEmojiOpen((value) => !value)}
        >
          <SmilePlus className="size-5 text-muted-foreground sm:size-4" />
        </Button>

        <Textarea
          ref={ref}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            onTyping();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !isCoarsePointer) {
              event.preventDefault();
              submit();
            }
            if (event.key === "Escape") {
              setEmojiOpen(false);
              onCancelReply();
              onCancelEdit();
            }
          }}
          rows={1}
          placeholder={editing ? "Edit your message…" : "Message"}
          aria-label="Message input"
          enterKeyHint="send"
          className="max-h-[40vh] min-h-10 resize-none border-0 bg-transparent px-1 py-2 text-[16px] shadow-none focus-visible:ring-0 md:text-[15px] sm:min-h-9 sm:py-1.5 sm:text-[15px] dark:bg-transparent"
        />

        <Button
          size="sm"
          onClick={submit}
          disabled={!value.trim()}
          className="mb-0.5 shrink-0 rounded-full px-3 sm:px-4"
        >
          Send
        </Button>
      </div>
      <p className="mt-1.5 hidden px-1 text-[11px] text-muted-foreground sm:block">
        <strong>Enter</strong> to send · <strong>Shift + Enter</strong> for a new line
      </p>
    </div>
  );
}

/**
 * On touch devices Enter should insert a newline, not send — otherwise the
 * send button is unreachable and a stray tap loses a half-typed message.
 */
function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(pointer: coarse)");
    setCoarse(query.matches);
    const onChange = (event: MediaQueryListEvent) => setCoarse(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  return coarse;
}
