import * as React from "react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import type { MyServer, PresenceStatus } from "@/lib/database.types";

interface RailProps {
  servers: MyServer[];
  activeServerId: string | null;
  unreadByServer?: Record<string, number>;
  /** "vertical" is the desktop rail; "horizontal" is the mobile bottom bar. */
  orientation?: "vertical" | "horizontal";
  onSelectHome: () => void;
  onSelectFriends: () => void;
  onSelectServer: (id: string) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
  onOpenProfile: () => void;
  profile: { id: string; display_name: string; avatar_url: string | null } | null;
  status: PresenceStatus;
}

function Tile({
  active,
  onClick,
  label,
  orientation,
  children,
  indicator,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  orientation: "vertical" | "horizontal";
  children: React.ReactNode;
  indicator?: number;
}) {
  const vertical = orientation === "vertical";

  return (
    <div
      className={cn(
        "group relative flex justify-center",
        vertical ? "" : "flex-1 shrink-0",
      )}
    >
      {/* Active pill: left edge on desktop, bottom edge on mobile. */}
      {vertical ? (
        <span
          aria-hidden="true"
          className={cn(
            "absolute top-1/2 -left-3 h-8 w-1 -translate-y-1/2 rounded-r-full bg-foreground transition-all duration-200",
            active ? "opacity-100" : "scale-y-0 opacity-0 group-hover:scale-y-75 group-hover:opacity-40",
          )}
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-1 -top-1 h-1 rounded-full bg-foreground transition-opacity duration-200",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-40",
          )}
        />
      )}

      <button
        type="button"
        onClick={onClick}
        title={label}
        aria-label={label}
        aria-current={active ? "page" : undefined}
        className={cn(
          "relative flex items-center justify-center overflow-hidden transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
          vertical
            ? "size-12 rounded-[28%] hover:rounded-2xl"
            : "size-11 rounded-2xl",
          active && (vertical ? "rounded-2xl ring-2 ring-foreground/80" : "bg-foreground/10"),
          !active && vertical && "ring-1 ring-border",
        )}
      >
        {children}
        {indicator && indicator > 0 ? (
          <span
            aria-label={`${indicator} unread`}
            className="absolute -right-0.5 -bottom-0.5 flex min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground ring-2 ring-background"
          >
            {indicator > 99 ? "99+" : indicator}
          </span>
        ) : null}
      </button>
    </div>
  );
}

/** Server rail. Vertical on desktop, a scrollable bottom bar on mobile. */
export function Rail({
  servers,
  activeServerId,
  unreadByServer = {},
  orientation = "vertical",
  onSelectHome,
  onSelectFriends,
  onSelectServer,
  onCreateServer,
  onJoinServer,
  onOpenProfile,
  profile,
  status,
}: RailProps) {
  const vertical = orientation === "vertical";

  return (
    <nav
      aria-label="Servers"
      className={cn(
        vertical
          ? "flex w-[4.5rem] shrink-0 flex-col items-center gap-2 overflow-y-auto border-r border-border/70 bg-muted/50 py-3"
          : "flex w-full items-center gap-1 overflow-x-auto border-t border-border/70 bg-muted/60 px-2 py-1.5",
      )}
    >
      <Tile onClick={onSelectHome} label="Home" orientation={orientation}>
        <HomeGlyph />
      </Tile>

      <Tile onClick={onSelectFriends} label="Friends" orientation={orientation}>
        <FriendsGlyph />
      </Tile>

      <div
        aria-hidden="true"
        className={cn("rounded-full bg-border", vertical ? "my-1 h-0.5 w-8" : "mx-1 h-6 w-0.5")}
      />

      {servers.map((server) => (
        <Tile
          key={server.id}
          active={activeServerId === server.id}
          onClick={() => onSelectServer(server.id)}
          label={server.name}
          orientation={orientation}
          indicator={unreadByServer[server.id]}
        >
          {server.icon_url ? (
            <img src={server.icon_url} alt="" className="size-full object-cover" draggable={false} />
          ) : (
            <span
              className={cn(
                "font-display flex size-full items-center justify-center bg-linear-to-br from-ember-500 to-gold-400 text-white",
                vertical ? "text-lg" : "text-base",
              )}
            >
              {server.name.slice(0, 2).toUpperCase()}
            </span>
          )}
        </Tile>
      ))}

      <Tile onClick={onCreateServer} label="Create a server" orientation={orientation}>
        <span
          className={cn(
            "flex size-full items-center justify-center bg-foreground/8 text-foreground transition-colors",
            vertical && "group-hover:bg-foreground group-hover:text-background",
          )}
        >
          <PlusGlyph />
        </span>
      </Tile>

      <Tile onClick={onJoinServer} label="Join a server with an invite" orientation={orientation}>
        <span className="flex size-full items-center justify-center bg-foreground/8 text-foreground">
          <LinkGlyph />
        </span>
      </Tile>

      <div className={cn(vertical ? "mt-auto pt-2" : "ml-auto pl-1")}>
        <button
          type="button"
          onClick={onOpenProfile}
          title="Your profile"
          aria-label="Your profile"
          className="block rounded-full transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60"
        >
          <Avatar
            seed={profile?.id ?? "me"}
            name={profile?.display_name ?? "You"}
            src={profile?.avatar_url}
            size={vertical ? 40 : 36}
            status={status}
            showStatus
          />
        </button>
      </div>
    </nav>
  );
}

/* Inline glyphs keep the rail dependency-free and perfectly crisp. */

function HomeGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3 10.5 12 3l9 7.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FriendsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.8 19.5c.6-3.1 3.2-5 6.2-5s5.6 1.9 6.2 5" strokeLinecap="round" />
      <path d="M16.5 6.2a3 3 0 0 1 0 5.6M18 14.9c1.9.7 3 2.3 3.2 4.6" strokeLinecap="round" />
    </svg>
  );
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

function LinkGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
      <path d="M10.5 13.5a4 4 0 0 0 5.7 0l2.6-2.6a4 4 0 0 0-5.7-5.7l-1.3 1.3" strokeLinecap="round" />
      <path d="M13.5 10.5a4 4 0 0 0-5.7 0l-2.6 2.6a4 4 0 0 0 5.7 5.7l1.3-1.3" strokeLinecap="round" />
    </svg>
  );
}
