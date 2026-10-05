import * as React from "react";
import { Crown, LogOut, MessageSquare, MoreVertical, Pencil, Shield, UserMinus, UserPlus } from "lucide-react";

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
import type { Role, PresenceStatus } from "@/lib/database.types";
import type { Member } from "@/hooks/useCadenceData";

interface MemberListProps {
  members: Member[];
  roles: Role[];
  currentUserId: string;
  ownerId: string;
  basePermissions: number;
  presence: Record<string, PresenceStatus>;
  onlineIds: string[];
  /** True when the viewer may rename other members. */
  canRenameOthers?: boolean;
  onOpenProfile: (userId: string) => void;
  onOpenDm: (userId: string) => void;
  onKick: (userId: string) => void;
  onBan: (userId: string) => void;
  onAddFriend: (userId: string) => void;
  onSetNickname: (userId: string, nickname: string | null) => void;
}

export function MemberList({
  members,
  roles,
  currentUserId,
  ownerId,
  basePermissions,
  presence = {},
  onlineIds = [],
  canRenameOthers = false,
  onOpenProfile,
  onOpenDm,
  onKick,
  onBan,
  onAddFriend,
  onSetNickname,
}: MemberListProps) {
  const onlineSet = React.useMemo(() => new Set(onlineIds), [onlineIds]);
  const canModerate = basePermissions === -1 || (basePermissions & (1 << 5)) !== 0;

  const statusOf = (userId: string): PresenceStatus =>
    presence[userId] ?? (onlineSet.has(userId) ? "online" : "offline");

  const groups = React.useMemo(() => {
    const sorted = [...members].sort((a, b) => {
      const aOwner = a.id === ownerId ? 0 : 1;
      const bOwner = b.id === ownerId ? 0 : 1;
      if (aOwner !== bOwner) return aOwner - bOwner;
      const aOnline = statusOf(a.id) === "offline" ? 1 : 0;
      const bOnline = statusOf(b.id) === "offline" ? 1 : 0;
      if (aOnline !== bOnline) return aOnline - bOnline;
      return (a.nickname ?? a.display_name).localeCompare(b.nickname ?? b.display_name);
    });

    const online = sorted.filter((m) => statusOf(m.id) !== "offline");
    const offline = sorted.filter((m) => statusOf(m.id) === "offline");
    return [
      { label: "Online", people: online },
      { label: "Offline", people: offline },
    ].filter((group) => group.people.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, ownerId, presence, onlineSet]);

  return (
    <aside
      aria-label="Members"
      className="hidden w-60 shrink-0 overflow-y-auto border-l border-border/70 bg-muted/30 lg:block"
    >
      {groups.map((group) => (
        <section key={group.label} className="px-3 pt-4 pb-1">
          <h2 className="px-1 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
            {group.label} — {group.people.length}
          </h2>
          <ul className="space-y-0.5">
            {group.people.map((member) => {
              const isOwner = member.id === ownerId;
              const topRole = roles
                .filter((role) => member.roleIds.includes(role.id))
                .sort((a, b) => b.position - a.position)[0];

              return (
                <li key={member.id} className="group/member relative">
                  <button
                    type="button"
                    onClick={() => onOpenProfile(member.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-1.5 py-1.5 text-left transition-colors",
                      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                      "hover:bg-foreground/5",
                      statusOf(member.id) === "offline" && "opacity-45",
                    )}
                  >
                    <Avatar
                      seed={member.id}
                      name={member.nickname ?? member.display_name}
                      src={member.avatar_url}
                      size={30}
                      status={statusOf(member.id)}
                      showStatus
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="truncate text-[14px]">
                          {member.nickname ?? member.display_name}
                        </span>
                        {isOwner ? <Crown className="size-3 shrink-0 text-gold-500" /> : null}
                      </span>
                      {topRole && !topRole.is_default ? (
                        <span
                          className="block truncate text-[11px] font-medium"
                          style={{ color: topRole.color }}
                        >
                          {topRole.name}
                        </span>
                      ) : null}
                    </span>
                  </button>

                  <div className="absolute top-1/2 right-1 flex -translate-y-1/2 gap-0.5 rounded border border-border bg-card p-0.5 opacity-0 shadow-md transition-opacity focus-within:opacity-100 group-hover/member:opacity-100">
                    {member.id !== currentUserId ? (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          title="Send a direct message"
                          aria-label={`Message ${member.display_name}`}
                          onClick={() => onOpenDm(member.id)}
                        >
                          <MessageSquare className="size-3.5" />
                        </Button>
                        {canModerate ? (
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            title="Add friend"
                            aria-label={`Add ${member.display_name} as a friend`}
                            onClick={() => onAddFriend(member.id)}
                          >
                            <UserPlus className="size-3.5" />
                          </Button>
                        ) : null}
                      </>
                    ) : null}

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label="Member actions">
                          <MoreVertical className="size-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuLabel className="truncate">{member.display_name}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => onOpenProfile(member.id)}>
                          <Shield className="size-4" /> View profile
                        </DropdownMenuItem>
                        {member.id !== currentUserId || canRenameOthers ? (
                          <DropdownMenuItem
                            onSelect={() => {
                              const next = window.prompt(
                                "Nickname (leave blank to clear)",
                                member.nickname ?? "",
                              );
                              if (next === null) return;
                              const trimmed = next.trim().slice(0, 32);
                              onSetNickname(
                                member.id,
                                trimmed.length === 0 ? null : trimmed,
                              );
                            }}
                          >
                            <Pencil className="size-4" /> Change nickname
                          </DropdownMenuItem>
                        ) : null}
                        {member.id !== currentUserId ? (
                          <DropdownMenuItem onSelect={() => onOpenDm(member.id)}>
                            <MessageSquare className="size-4" /> Send message
                          </DropdownMenuItem>
                        ) : null}
                        {canModerate && member.id !== currentUserId && !isOwner ? (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onSelect={() => onKick(member.id)}>
                              <LogOut className="size-4" /> Kick from server
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onSelect={() => onBan(member.id)}>
                              <UserMinus className="size-4" /> Ban from server
                            </DropdownMenuItem>
                          </>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </aside>
  );
}
