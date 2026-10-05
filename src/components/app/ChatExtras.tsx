import * as React from "react";
import { ChevronRight, Pin, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Pin as PinRow, Profile, Message } from "@/lib/database.types";
import type { SearchHit } from "@/hooks/useChatExtras";

/* --------------------------------------------------------------- pins --- */

/** Horizontally scrollable strip of pinned messages, shown above the composer. */
export function PinsBar({
  pins,
  messages,
  authors,
  onJump,
  onClose,
}: {
  pins: PinRow[];
  messages: Message[];
  authors: Map<string, Profile>;
  onJump: (messageId: string) => void;
  onClose: () => void;
}) {
  const byId = React.useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );

  if (pins.length === 0) return null;

  return (
    <div className="flex items-center gap-2 border-t border-border/70 bg-gold-400/8 px-2 py-1.5 sm:px-3">
      <Pin className="size-3.5 shrink-0 text-gold-600 dark:text-gold-400" />
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto">
        {pins.map((pin) => {
          const message = byId.get(pin.message_id);
          const author = message ? (authors.get(message.author_id) ?? null) : null;
          return (
            <button
              key={pin.message_id}
              type="button"
              onClick={() => message && onJump(message.id)}
              disabled={!message}
              className="flex w-56 shrink-0 items-center gap-2 rounded-lg border border-gold-500/30 bg-card/80 px-2 py-1 text-left transition-colors hover:bg-card focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
            >
              {message ? (
                <>
                  <Avatar
                    seed={message.author_id}
                    name={author?.display_name ?? "Member"}
                    src={author?.avatar_url}
                    size={22}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-medium">
                      {author?.display_name ?? "Member"}
                    </span>
                    <span className="block truncate text-[11px] text-muted-foreground">
                      {message.content}
                    </span>
                  </span>
                </>
              ) : (
                <span className="truncate text-[11px] text-muted-foreground">
                  {message ? message.content : "Pinned message unavailable"}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label="Hide pinned messages"
        onClick={onClose}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  );
}

/* -------------------------------------------------------------- search --- */

/** In-channel / in-server message search. */
export function SearchBar({
  scopeLabel,
  query,
  onQueryChange,
  hits,
  searching,
  onJump,
  onClose,
}: {
  scopeLabel: string;
  query: string;
  onQueryChange: (value: string) => void;
  hits: SearchHit[];
  searching: boolean;
  onJump: (messageId: string) => void;
  onClose: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const close = () => {
    onClose();
    onQueryChange("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2">
        {open ? (
          <div className="flex flex-1 items-center gap-2 rounded-lg border bg-background px-2 py-1">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") close();
                if (event.key === "Enter" && hits[0]) onJump(hits[0].id);
              }}
              placeholder={`Search in ${scopeLabel}`}
              aria-label={`Search messages in ${scopeLabel}`}
              className="h-7 border-0 px-0 text-sm shadow-none focus-visible:ring-0 dark:bg-transparent"
            />
            <Button variant="ghost" size="icon-xs" aria-label="Close search" onClick={close}>
              <X className="size-3.5" />
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Search in ${scopeLabel}`}
            onClick={() => {
              setOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }}
          >
            <Search className="size-4" />
          </Button>
        )}
      </div>

      {open && query.trim().length >= 2 ? (
        <div className="absolute top-full right-0 z-30 mt-1 max-h-72 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border bg-card p-1.5 shadow-xl">
          {searching ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-muted-foreground">
              No messages matched “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-0.5">
              {hits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onJump(hit.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Avatar
                      seed={hit.author_id}
                      name={hit.author?.display_name ?? "Member"}
                      src={hit.author?.avatar_url}
                      size={24}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12px] font-medium">
                        {hit.author?.display_name ?? "Member"}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {new Date(hit.created_at).toLocaleString()}
                        </span>
                      </span>
                      <span className="line-clamp-2 text-[12px] text-muted-foreground">
                        {hit.content}
                      </span>
                    </span>
                    <ChevronRight className="mt-1 size-3 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Divider marking where you left off last time. */
export function UnreadDivider({ label = "New messages" }: { label?: string }) {
  return (
    <div className="my-2 flex items-center gap-2 px-3 sm:px-4">
      <span className="h-px flex-1 bg-primary/60" />
      <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold text-primary">
        {label}
      </span>
      <span className="h-px flex-1 bg-primary/60" />
    </div>
  );
}

/** Mobile-only channel switcher button in the chat header. */
export function ChannelPickerButton({
  onClick,
  label,
  unread,
  className,
}: {
  onClick: () => void;
  label: string;
  unread?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open channel list"
      className={cn(
        "relative flex min-w-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 md:hidden",
        className,
      )}
    >
      <span className="truncate font-semibold">{label}</span>
      {unread && unread > 0 ? (
        <span className="flex min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </button>
  );
}