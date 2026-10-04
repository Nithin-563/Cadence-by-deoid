import * as React from "react";
import {
  ChevronDown,
  Hash,
  LogOut,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  Trash2,
  UserPlus,
  Volume2,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/hooks/useTheme";
import type { Channel, MyServer, Profile, PresenceStatus } from "@/lib/database.types";
import type { DmChannel } from "@/hooks/useCadenceData";

/* ------------------------------------------------------- server sidebar --- */

interface ServerSidebarProps {
  server: MyServer;
  channels: Channel[];
  activeChannelId: string | null;
  canManageChannels: boolean;
  onSelectChannel: (id: string) => void;
  onCreateChannel: () => void;
  onOpenSettings: () => void;
  onInvite: () => void;
  onLeave: () => void;
  onDeleteServer: () => void;
  onToggleMembers: () => void;
  membersVisible: boolean;
  onlineCount: number;
}

export function ServerSidebar({
  server,
  channels,
  activeChannelId,
  canManageChannels,
  onSelectChannel,
  onCreateChannel,
  onOpenSettings,
  onInvite,
  onLeave,
  onDeleteServer,
  onToggleMembers,
  membersVisible,
  onlineCount,
}: ServerSidebarProps) {
  const textChannels = channels.filter((channel) => channel.kind === "text");

  return (
    <div className="flex h-full flex-col border-r border-border/70 bg-muted/40">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="flex h-12 w-full shrink-0 items-center justify-between gap-2 border-b border-border/70 px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <span className="truncate">{server.name}</span>
            <ChevronDown className="size-4 shrink-0 opacity-70" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuLabel className="truncate">{server.name}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onInvite}>
            <UserPlus className="size-4" /> Invite people
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canManageChannels} onSelect={onCreateChannel}>
            <Plus className="size-4" /> Create channel
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onOpenSettings}>
            <Settings className="size-4" /> Server settings
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onToggleMembers}>
            <Shield className="size-4" />
            {membersVisible ? "Hide" : "Show"} member list
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={onLeave}>
            <LogOut className="size-4" /> Leave server
          </DropdownMenuItem>
          {server.owner_id ? (
            <DropdownMenuItem variant="destructive" onSelect={onDeleteServer}>
              <Trash2 className="size-4" /> Delete server
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        <section>
          <div className="mb-1 flex items-center justify-between px-2">
            <h2 className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
              Text channels
            </h2>
            {canManageChannels ? (
              <button
                type="button"
                onClick={onCreateChannel}
                aria-label="Create channel"
                className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Plus className="size-4" />
              </button>
            ) : null}
          </div>

          <ul className="space-y-0.5">
            {textChannels.map((channel) => {
              const active = channel.id === activeChannelId;
              return (
                <li key={channel.id}>
                  <button
                    type="button"
                    onClick={() => onSelectChannel(channel.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-[15px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "bg-foreground/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    <Hash
                      className={cn(
                        "size-4 shrink-0",
                        active ? "text-muted-foreground" : "opacity-40 group-hover:opacity-70",
                      )}
                    />
                    <span className="truncate">{channel.name}</span>
                  </button>
                </li>
              );
            })}
            {textChannels.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                No channels you can see yet.
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <h2 className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Server
          </h2>
          <div className="space-y-0.5 px-2 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Shield className="size-4 opacity-60" />
              {server.member_role} · {onlineCount} online
            </p>
            <p className="flex items-start gap-2 pt-1">
              <Volume2 className="mt-0.5 size-4 shrink-0 opacity-60" />
              <span className="text-xs leading-relaxed">
                Voice and video channels land in the next release.
              </span>
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ DM sidebar --- */

interface DmSidebarProps {
  dms: DmChannel[];
  friends: Profile[];
  pendingCount: number;
  onlineIds: string[];
  presence: Record<string, PresenceStatus>;
  activeChannelId: string | null;
  onSelectDm: (id: string) => void;
  onSelectFriends: () => void;
  onOpenProfile: (userId: string) => void;
}

export function DmSidebar({
  dms,
  friends,
  pendingCount,
  onlineIds,
  presence,
  activeChannelId,
  onSelectDm,
  onSelectFriends,
  onOpenProfile,
}: DmSidebarProps) {
  const onlineSet = React.useMemo(() => new Set(onlineIds), [onlineIds]);

  return (
    <div className="flex h-full flex-col border-r border-border/70 bg-muted/40">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border/70 px-4">
        <h2 className="text-sm font-semibold">Direct Messages</h2>
        <button
          type="button"
          onClick={onSelectFriends}
          className="relative rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label="Find friends"
        >
          <UserPlus className="size-4" />
          {pendingCount > 0 ? (
            <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
              {pendingCount}
            </span>
          ) : null}
        </button>
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
        <section>
          <button
            type="button"
            onClick={onSelectFriends}
            className="mb-1 flex w-full items-center justify-between px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase transition-colors hover:text-foreground"
          >
            <span>Friends</span>
            <span className="text-[10px] font-medium normal-case">{friends.length} online</span>
          </button>
          <ul className="space-y-0.5">
            {friends.slice(0, 12).map((friend) => (
              <li key={friend.id}>
                <button
                  type="button"
                  onClick={() => onOpenProfile(friend.id)}
                  className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[15px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <Avatar
                    seed={friend.id}
                    name={friend.display_name}
                    src={friend.avatar_url}
                    size={28}
                    status={presence[friend.id] ?? (onlineSet.has(friend.id) ? "online" : "offline")}
                    showStatus
                  />
                  <span className="truncate">{friend.display_name}</span>
                </button>
              </li>
            ))}
            {friends.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                No friends yet — find some in the directory.
              </li>
            ) : null}
          </ul>
        </section>

        <section>
          <h2 className="mb-1 px-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            Direct messages
          </h2>
          <ul className="space-y-0.5">
            {dms.map((dm) => {
              const active = dm.id === activeChannelId;
              const status = dm.partner
                ? (presence[dm.partner.id] ?? (onlineSet.has(dm.partner.id) ? "online" : "offline"))
                : "offline";
              return (
                <li key={dm.id}>
                  <button
                    type="button"
                    onClick={() => onSelectDm(dm.id)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[15px] transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      active
                        ? "bg-foreground/10 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
                    )}
                  >
                    <Avatar
                      seed={dm.partner?.id ?? dm.id}
                      name={dm.partner?.display_name ?? "Unknown"}
                      src={dm.partner?.avatar_url}
                      size={28}
                      status={status}
                      showStatus
                    />
                    <span className="truncate">{dm.partner?.display_name ?? "Unknown member"}</span>
                  </button>
                </li>
              );
            })}
            {dms.length === 0 ? (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">
                No conversations yet.
              </li>
            ) : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- user panel --- */

/** Bottom-left strip: current user, theme toggle, settings, sign out. */
export function UserPanel({
  profile,
  status,
  onOpenSettings,
  onSignOut,
}: {
  profile: { id: string; display_name: string; username: string; avatar_url: string | null } | null;
  status: PresenceStatus;
  onOpenSettings: () => void;
  onSignOut: () => void;
}) {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2 border-t border-border/70 bg-card/60 px-2 py-2">
      <Avatar
        seed={profile?.id ?? "me"}
        name={profile?.display_name ?? "You"}
        src={profile?.avatar_url}
        size={32}
        status={status}
        showStatus
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] leading-tight font-medium">
          {profile?.display_name ?? "You"}
        </p>
        <p className="truncate text-[11px] leading-tight text-muted-foreground">
          {profile ? `@${profile.username}` : ""}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Switch theme"
        aria-label="Switch theme"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
      </Button>
      <Button variant="ghost" size="icon-sm" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
        <Settings className="size-4" />
      </Button>
      <Button variant="ghost" size="icon-sm" title="Sign out" aria-label="Sign out" onClick={onSignOut}>
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}
