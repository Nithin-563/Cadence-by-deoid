import * as React from "react";
import { MessageSquare, Menu, Plus, UserPlus, Users } from "lucide-react";

import { supabase } from "@/lib/supabase";
import {
  rows,
  type Message,
  type MyServer,
  type Profile,
  type Reaction,
  type PresenceStatus,
} from "@/lib/database.types";
import { useAuth } from "@/hooks/useAuth";
import { usePresence, useTyping } from "@/hooks/usePresence";
import {
  markChannelRead,
  useDirectChannels,
  useFriendRequests,
  useMyServers,
  useServerChannels,
  useServerMembers,
  useUnread,
  type DmChannel,
} from "@/hooks/useCadenceData";
import { useMessageSearch, usePins } from "@/hooks/useChatExtras";
import { useVoice } from "@/hooks/useVoice";
import { useOccupantProfiles, useVoiceChannels } from "@/hooks/useVoiceChannels";
import { useMessages } from "@/hooks/useMessages";
import { PERMISSIONS } from "@/lib/permissions";

import { Rail } from "@/components/app/Rail";
import { DmSidebar, ServerSidebar, UserPanel } from "@/components/app/Sidebar";
import { Composer, MessageItem, formatDayDivider, uploadAttachments } from "@/components/app/Chat";
import { PinsBar, SearchBar } from "@/components/app/ChatExtras";
import { VoiceChannelList, VoiceError, VoiceStage } from "@/components/app/Voice";
import { MemberList } from "@/components/app/MemberList";
import { FriendsView } from "@/components/app/FriendsView";
import { SettingsView } from "@/components/app/SettingsView";
import { ServerSettings } from "@/components/app/ServerSettings";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { FullPageLoader } from "@/components/app/AuthGate";
import {
  CreateChannelDialog,
  CreateServerDialog,
  InviteDialog,
  JoinServerDialog,
  ProfileDialog,
} from "@/components/app/dialogs";

/** What the middle pane is currently showing. */
type View =
  | { kind: "home" }
  | { kind: "friends" }
  | { kind: "settings" }
  | { kind: "server-settings"; serverId: string }
  | { kind: "channel"; serverId: string | null; channelId: string; title: string };

const NOOP = () => undefined;

export function CadenceApp() {
  const { user, profile, signOut } = useAuth();
  const { presence, onlineIds, setStatus } = usePresence();

  const { servers, reload: reloadServers } = useMyServers();
  const [view, setView] = React.useState<View>({ kind: "home" });
  const [membersVisible, setMembersVisible] = React.useState(true);

  const [createServerOpen, setCreateServerOpen] = React.useState(false);
  const [joinServerOpen, setJoinServerOpen] = React.useState(false);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [createChannelOpen, setCreateChannelOpen] = React.useState(false);
  const [profileTarget, setProfileTarget] = React.useState<Profile | null>(null);

  // Mobile drawers
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [membersOpen, setMembersOpen] = React.useState(false);
  const [pinsHidden, setPinsHidden] = React.useState(false);

  const activeServerId =
    view.kind === "channel" ? view.serverId : view.kind === "server-settings" ? view.serverId : null;

  const server: MyServer | null = servers.find((s) => s.id === activeServerId) ?? null;
  const activeChannelId = view.kind === "channel" ? view.channelId : null;

  /* ------------------------------------------------------------- data --- */

  const { channels, reload: reloadChannels } = useServerChannels(
    view.kind === "channel" ? view.serverId : server?.id ?? null,
  );
  const { members, roles } = useServerMembers(server?.id ?? null);
  const { channels: dms, reload: reloadDms } = useDirectChannels();
  const messageApi = useMessages(activeChannelId);
  const pendingCount = useFriendRequests();
  const { typingIds, notifyTyping } = useTyping(activeChannelId, user?.id);

  const unread = useUnread(server?.id ?? null, dms.map((dm) => dm.id), user?.id, profile?.username);
  const pins = usePins(activeChannelId);
  const search = useMessageSearch(
    view.kind === "channel" && view.serverId ? activeChannelId : null,
    view.kind === "channel" && !view.serverId ? null : (server?.id ?? null),
  );

  const pinnedIds = React.useMemo(
    () => new Set(pins.pins.map((pin) => pin.message_id)),
    [pins.pins],
  );

  /* ------------------------------------------------------------- voice --- */

  const voice = useVoice(user?.id);
  const {
    channels: voiceChannels,
    occupants,
    create: createVoiceChannel,
    rename: renameVoiceChannel,
    remove: removeVoiceChannel,
    setPresence: setVoicePresence,
  } = useVoiceChannels(server?.id ?? null);
  const occupantProfiles = useOccupantProfiles(occupants);

  const occupantProfileMap = React.useMemo(() => {
    const map = new Map<string, Profile>();
    for (const profile of occupantProfiles) map.set(profile.id, profile);
    return map;
  }, [occupantProfiles]);

  // Mirror the live WebRTC session into voice_states so the sidebar can list
  // who's in a channel without needing every peer connected.
  React.useEffect(() => {
    if (!user?.id) return;
    const sessionId = voice.channelId ?? "";
    void setVoicePresence(voice.channelId, sessionId, {
      muted: voice.muted,
      deafened: voice.deafened,
    });
  }, [voice.channelId, voice.muted, voice.deafened, voice.status, user?.id, setVoicePresence]);

  // Leave the channel when switching server or channel.
  React.useEffect(() => {
    if (voice.channelId && server && !voiceChannels.some((c) => c.id === voice.channelId)) {
      voice.leave();
    }
  }, [voiceChannels, voice.channelId, server, voice]);

  const joinVoice = React.useCallback(
    (channelId: string) => {
      if (voice.channelId === channelId) {
        voice.leave();
        return;
      }
      if (voice.channelId) voice.leave();
      void voice.join(channelId);
    },
    [voice],
  );

  // Opening a channel marks it read, which clears its badge.
  React.useEffect(() => {
    if (!activeChannelId || !user?.id) return;
    void markChannelRead(activeChannelId, user.id);
  }, [activeChannelId, user?.id]);

  /* -------------------------------------------------------- attachments --- */

  const [uploading, setUploading] = React.useState(false);

  const pickFiles = React.useCallback(
    async (files: File[]) => {
      if (!user?.id || !activeChannelId || files.length === 0) return null;
      setUploading(true);
      try {
        return await uploadAttachments(user.id, activeChannelId, files);
      } finally {
        setUploading(false);
      }
    },
    [user?.id, activeChannelId],
  );

  /** Scroll a specific message into view (pins, search results). */
  const jumpToMessage = React.useCallback((messageId: string) => {
    window.requestAnimationFrame(() => {
      document.getElementById(messageId)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  /* ------------------------------------------------------- permissions --- */

  const basePermissions = server?.permissions ?? 0;
  const can = (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
    basePermissions === -1 || (basePermissions & PERMISSIONS[permission]) !== 0;

  const channelPermissions = React.useMemo(() => {
    // DMs grant everything to their members.
    if (view.kind === "channel" && view.serverId === null) return -1;
    if (basePermissions === -1) return -1;
    if (!user) return 0;

    const member = members.find((m) => m.id === user.id);
    const everyoneRole = roles.find((role) => role.is_default);
    const assigned = roles.filter((role) => member?.roleIds.includes(role.id));

    const union =
      (everyoneRole?.permissions ?? 0) |
      assigned.reduce((acc, role) => acc | role.permissions, 0);

    return (union & PERMISSIONS.ADMINISTRATOR) !== 0 ? -1 : union;
  }, [view, basePermissions, roles, members, user]);

  const channelAllows = React.useCallback(
    (permission: (typeof PERMISSIONS)[keyof typeof PERMISSIONS]) =>
      channelPermissions === -1 || (channelPermissions & PERMISSIONS[permission]) !== 0,
    [channelPermissions],
  );

  /* ------------------------------------------------------------ actions --- */

  const openChannel = (next: View) => {
    setView(next);
  };

  const selectServer = (id: string) => {
    const target = servers.find((s) => s.id === id);
    setView(
      target
        ? { kind: "channel", serverId: id, channelId: "", title: target.name }
        : { kind: "home" },
    );
  };

  /** Pick the first text channel when a server is opened without one. */
  const jumpToFirstChannel = React.useCallback(async (serverId: string) => {
    const { data } = await supabase
      .from("channels")
      .select("id, name")
      .eq("server_id", serverId)
      .eq("kind", "text")
      .order("position", { ascending: true })
      .limit(1);
    const first = rows<{ id: string; name: string }>(data)[0];
    if (first) {
      setView((current) =>
        current.kind === "channel" && current.serverId === serverId && !current.channelId
          ? { ...current, channelId: first.id, title: first.name }
          : current,
      );
    }
  }, []);

  // Auto-select the first channel when a server is picked with none active.
  React.useEffect(() => {
    if (view.kind !== "channel" || view.channelId || !view.serverId) return;
    void jumpToFirstChannel(view.serverId);
  }, [view, jumpToFirstChannel]);

  const openDm = async (userId: string) => {
    const { data, error } = await supabase.rpc("open_dm", { p_other: userId });
    if (error) {
      console.error("open_dm failed", error);
      return;
    }
    const channelId = String(data);
    await reloadDms();
    const partner = members.find((m) => m.id === userId);
    setProfileTarget(null);
    openChannel({
      kind: "channel",
      serverId: null,
      channelId,
      title: partner?.display_name ?? "Direct message",
    });
  };

  const addFriend = async (userId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user.id, addressee_id: userId });
    if (error && !error.message.includes("duplicate")) {
      console.error("add friend failed", error);
    }
  };

  const blockUser = async (userId: string) => {
    if (!user) return;
    await supabase.from("user_blocks").upsert({ blocker_id: user.id, blocked_id: userId });
    setProfileTarget(null);
    void reloadDms();
  };

  const leaveServer = async () => {
    if (!server || !user) return;
    if (!window.confirm(`Leave ${server.name}? You'll need a new invite to come back.`)) return;
    await supabase.from("server_members").delete().eq("server_id", server.id).eq("user_id", user.id);
    await reloadServers();
    setView({ kind: "home" });
  };

  const deleteServer = async () => {
    if (!server || !user) return;
    if (
      !window.confirm(
        `Delete ${server.name}? This removes every channel, message and member permanently.`,
      )
    )
      return;
    await supabase.from("servers").delete().eq("id", server.id);
    await reloadServers();
    setView({ kind: "home" });
  };

  const kickMember = async (userId: string) => {
    if (!server) return;
    await supabase.from("server_members").delete().eq("server_id", server.id).eq("user_id", userId);
  };

  const banMember = async (userId: string) => {
    if (!server || !user) return;
    await supabase.from("server_members").delete().eq("server_id", server.id).eq("user_id", userId);
    await supabase.from("server_bans").upsert({
      server_id: server.id,
      user_id: userId,
      banned_by: user.id,
    });
  };

  const setNickname = async (userId: string, nickname: string | null) => {
    if (!server) return;
    const { error } = await supabase
      .from("server_members")
      .update({ nickname })
      .eq("server_id", server.id)
      .eq("user_id", userId);
    if (error) console.error("set nickname failed", error);
  };

  const openUserProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle();
    if (data) setProfileTarget(data as Profile);
  };

  /* ------------------------------------------------------ composer state --- */
  const [replyTo, setReplyTo] = React.useState<{ id: string; content: string; authorName: string } | null>(null);
  const [editing, setEditing] = React.useState<{ id: string; content: string } | null>(null);

  const profilesById = React.useMemo(() => {
    const map = new Map<string, Profile>();
    if (profile) map.set(profile.id, profile);
    for (const member of members) {
      map.set(member.id, {
        id: member.id,
        username: member.username,
        display_name: member.display_name,
        about: member.about,
        avatar_url: member.avatar_url,
        banner_url: member.banner_url ?? null,
        status_text: member.status_text,
        created_at: member.created_at,
        updated_at: member.updated_at,
      });
    }
    for (const dm of dms) {
      if (dm.partner) map.set(dm.partner.id, dm.partner);
    }
    return map;
  }, [profile, members, dms]);

  const friends = React.useMemo(
    () =>
      dms
        .map((dm) => dm.partner)
        .filter((person): person is Profile => Boolean(person)),
    [dms],
  );

  /* ---------------------------------------------------------- rendering --- */

  // AuthGate already guarantees a signed-in user with a loaded profile, so these
  // are defensive only — they must never strand the user on a blank screen.
  if (!user || !profile) return <FullPageLoader label="Opening Cadence…" />;

  const onSubmit = React.useCallback(
    async (content: string, attachments: import("@/lib/database.types").Attachment[]) => {
      await messageApi.send({ content, replyTo: replyTo?.id ?? null, attachments });
      setReplyTo(null);
    },
    [messageApi, replyTo],
  );

  const selectChannel = (id: string, targetServerId: string | null) => {
    const channel = channels.find((c) => c.id === id);
    const dm = dms.find((entry) => entry.id === id);
    setView({
      kind: "channel",
      serverId: targetServerId,
      channelId: id,
      title: targetServerId ? (channel?.name ?? "channel") : (dm?.partner?.display_name ?? "Direct message"),
    });
    setSidebarOpen(false);
  };

  /** Sidebar contents, rendered inline on desktop and in a sheet on mobile. */
  const sidebar = (
    <>
      {server ? (
        <ServerSidebar
          server={server}
          channels={channels}
          activeChannelId={activeChannelId}
          canManageChannels={can("MANAGE_CHANNELS")}
          unreadCounts={unread.counts}
          unreadMentions={unread.mentions}
          onSelectChannel={(id) => selectChannel(id, server.id)}
          onCreateChannel={() => {
            setCreateChannelOpen(true);
            setSidebarOpen(false);
          }}          onOpenSettings={() => {
            setView({ kind: "server-settings", serverId: server.id });
            setSidebarOpen(false);
          }}
          onInvite={() => {
            setInviteOpen(true);
            setSidebarOpen(false);
          }}
          onLeave={() => void leaveServer()}
          onDeleteServer={() => void deleteServer()}
          onToggleMembers={() => setMembersVisible((value) => !value)}
          membersVisible={membersVisible}
          onlineCount={members.filter((m) => (presence[m.id] ?? "offline") !== "offline").length}
        >
          <VoiceChannelList
            channels={voiceChannels}
            occupants={occupants}
            profiles={occupantProfileMap}
            activeVoiceChannelId={voice.channelId}
            canManage={can("MANAGE_CHANNELS")}
            onJoin={(channel) => joinVoice(channel.id)}
            onCreate={() => {
              const name = window.prompt("Voice channel name", "General voice");
              if (name?.trim()) void createVoiceChannel(name.trim().slice(0, 64));
            }}
            onRename={renameVoiceChannel}
            onDelete={removeVoiceChannel}
          />
        </ServerSidebar>
      ) : (
        <DmSidebar
          dms={dms}
          friends={friends}
          pendingCount={pendingCount}
          onlineIds={onlineIds}
          presence={presence}
          unreadCounts={unread.counts}
          unreadMentions={unread.mentions}
          activeChannelId={activeChannelId}
          onSelectDm={(id) => selectChannel(id, null)}
          onSelectFriends={() => {
            setView({ kind: "friends" });
            setSidebarOpen(false);
          }}
          onOpenProfile={(userId) => void openUserProfile(userId)}
        />
      )}

      <UserPanel
        profile={{
          id: profile.id,
          display_name: profile.display_name,
          username: profile.username,
          avatar_url: profile.avatar_url,
        }}
        status={presence[profile.id] ?? "online"}
        onOpenSettings={() => {
          setView({ kind: "settings" });
          setSidebarOpen(false);
        }}
        onSignOut={() => void signOut()}
      />
    </>
  );

  const memberList = server ? (
    <MemberList
      members={members}
      roles={roles}
      currentUserId={profile.id}
      ownerId={server.owner_id}
      basePermissions={basePermissions}
      presence={presence}
      onlineIds={onlineIds}
      onOpenProfile={(userId) => void openUserProfile(userId)}
      onOpenDm={(userId) => void openDm(userId)}
      onKick={(userId) => void kickMember(userId)}
      onBan={(userId) => void banMember(userId)}
      onAddFriend={(userId) => void addFriend(userId)}
      onSetNickname={(userId, nickname) => void setNickname(userId, nickname)}
      canRenameOthers={can("CHANGE_NICKNAME")}
    />
  ) : null;

  const railProps = {
    servers,
    activeServerId: server?.id ?? null,
    onSelectHome: () => {
      setView({ kind: "home" });
      setSidebarOpen(false);
    },
    onSelectFriends: () => {
      setView({ kind: "friends" });
      setSidebarOpen(false);
    },
    onSelectServer: (id: string) => {
      selectServer(id);
      setSidebarOpen(false);
    },
    onCreateServer: () => {
      setCreateServerOpen(true);
      setSidebarOpen(false);
    },
    onJoinServer: () => {
      setJoinServerOpen(true);
      setSidebarOpen(false);
    },
    onOpenProfile: () => {
      setView({ kind: "settings" });
      setSidebarOpen(false);
    },
    profile: { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url },
    status: (presence[profile.id] ?? "online") as PresenceStatus,
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background md:flex-row">
      {/* Desktop rail */}
      <div className="hidden md:flex">
        <Rail {...railProps} orientation="vertical" unreadByServer={{ [server?.id ?? ""]: unread.serverTotal }} />
      </div>

      {/* Desktop sidebar */}
      <div className="hidden w-60 shrink-0 flex-col md:flex">{sidebar}</div>

      {/* Mobile: channel / DM drawer */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" showCloseButton={false} className="w-[17.5rem] max-w-[85vw] gap-0 p-0 sm:max-w-[17.5rem]">
          <SheetTitle className="sr-only">Servers and channels</SheetTitle>
          <div className="flex h-full flex-col">{sidebar}</div>
        </SheetContent>
      </Sheet>

      {/* Mobile: member drawer */}
      <Sheet open={membersOpen} onOpenChange={setMembersOpen}>
        <SheetContent side="right" className="w-[17rem] gap-0 p-0 sm:max-w-[17rem]">
          <SheetTitle className="sr-only">Members</SheetTitle>
          <div className="h-full overflow-y-auto">{memberList}</div>
        </SheetContent>
      </Sheet>

      {/* Main pane */}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {view.kind === "home" ? (
          <HomePane
            servers={servers}
            dms={dms}
            onlineIds={onlineIds}
            presence={presence}
            onSelectServer={selectServer}
            onOpenChannel={(channelId, title) =>
              openChannel({ kind: "channel", serverId: null, channelId, title })
            }
            onCreateServer={() => setCreateServerOpen(true)}
            onJoinServer={() => setJoinServerOpen(true)}
            onOpenFriends={() => setView({ kind: "friends" })}
          />
        ) : null}

        {view.kind === "friends" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <FriendsView
              presence={presence}
              onlineIds={onlineIds}
              onOpenDm={(userId) => void openDm(userId)}
              onOpenProfile={(userId) => void openUserProfile(userId)}
              onChanged={reloadServers}
            />
          </div>
        ) : null}

        {view.kind === "settings" ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SettingsView status={presence[profile.id] ?? "online"} onStatusChange={setStatus} />
          </div>
        ) : null}

        {view.kind === "server-settings" && server ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ServerSettings
              server={server}
              channels={channels}
              roles={roles}
              members={members}
              memberRoleMap={Object.fromEntries(
                members.map((member) => [member.id, member.roleIds]),
              )}
              onChanged={() => {
                void reloadServers();
                void reloadChannels();
              }}
              onClose={() => setView({ kind: "channel", serverId: server.id, channelId: "", title: server.name })}
            />
          </div>
        ) : null}

        {view.kind === "channel" && activeChannelId ? (
          <>
            <header className="flex h-12 shrink-0 items-center gap-1.5 border-b border-border/70 px-2 sm:gap-2 sm:px-4">
              {/* Hamburger — mobile only */}
              <Button
                variant="ghost"
                size="icon-sm"
                className="shrink-0 md:hidden"
                aria-label="Open channel list"
                aria-expanded={sidebarOpen}
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="size-5" />
              </Button>

              <span className="hidden font-mono text-lg text-muted-foreground md:inline">
                {view.serverId ? "#" : "@"}
              </span>
              <h1 className="hidden min-w-0 truncate text-[15px] font-semibold md:block">
                {view.title || "channel"}
              </h1>

              {/* Compact channel title on mobile */}
              <span className="flex min-w-0 items-center gap-1 truncate md:hidden">
                <span className="font-mono text-muted-foreground">
                  {view.serverId ? "#" : "@"}
                </span>
                <span className="truncate text-[15px] font-semibold">
                  {view.title || "channel"}
                </span>
                {activeChannelId && unread.counts[activeChannelId] ? (
                  <span className="flex min-w-4 shrink-0 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unread.counts[activeChannelId] > 99 ? "99+" : unread.counts[activeChannelId]}
                  </span>
                ) : null}
              </span>

              {server ? (
                <span className="hidden min-w-0 truncate border-l border-border pl-3 text-sm text-muted-foreground md:block">
                  {channels.find((c) => c.id === activeChannelId)?.topic || "No topic set"}
                </span>
              ) : null}

              {typingIds.length > 0 ? (
                <span className="ml-auto hidden truncate text-xs text-teal lg:block">
                  {typingIds.length === 1 ? "Someone is typing…" : `${typingIds.length} people are typing…`}
                </span>
              ) : null}

              <div className="ml-auto flex items-center gap-0.5">
                <SearchBar
                  scopeLabel={view.title || "this channel"}
                  query={search.query}
                  onQueryChange={search.setQuery}
                  hits={search.hits}
                  searching={search.searching}
                  onJump={jumpToMessage}
                  onClose={search.reset}
                />

                {server ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="hidden shrink-0 rounded-full sm:inline-flex"
                    onClick={() => setInviteOpen(true)}
                  >
                    <UserPlus className="size-4" />
                    Invite
                  </Button>
                ) : null}

                {server ? (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label="Toggle member list"
                    aria-expanded={membersOpen}
                    onClick={() => setMembersOpen((value) => !value)}
                  >
                    <Users className="size-4" />
                  </Button>
                ) : null}
              </div>
            </header>

            {/* Typing indicator on small screens, where the header has no room */}
            {typingIds.length > 0 ? (
              <p className="shrink-0 px-3 pb-1 text-[11px] text-teal lg:hidden">
                {typingIds.length === 1 ? "Someone is typing…" : `${typingIds.length} people are typing…`}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto">
              {!channelAllows("VIEW_CHANNEL") ? (
                <div className="flex h-full items-center justify-center p-8 text-center">
                  <div>
                    <h2 className="text-lg font-semibold">You can't view this channel</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Ask a server admin for access, or pick another channel.
                    </p>
                  </div>
                </div>
              ) : messageApi.loading ? (
                <MessageSkeleton />
              ) : (
                <MessageList
                  messages={messageApi.messages}
                  reactions={messageApi.reactions}
                  profilesById={profilesById}
                  currentUserId={profile.id}
                  currentUsername={profile.username}
                  canManageMessages={channelAllows("MANAGE_MESSAGES")}
                  canReact={channelAllows("ADD_REACTIONS")}
                  pinnedIds={pinnedIds}
                  hasMore={messageApi.hasMore}
                  onLoadMore={() => void messageApi.loadMore()}
                  onReply={(message) => {
                    setEditing(null);
                    setReplyTo({
                      id: message.id,
                      content: message.content,
                      authorName: profilesById.get(message.author_id)?.display_name ?? "someone",
                    });
                  }}
                  onEdit={(message) => {
                    setReplyTo(null);
                    setEditing({ id: message.id, content: message.content });
                  }}
                  onDelete={(message) => void messageApi.remove(message.id)}
                  onReact={(messageId, emoji) => void messageApi.toggleReaction(messageId, emoji)}
                  onTogglePin={(message) => void pins.togglePin(message)}
                  onOpenProfile={(userId) => void openUserProfile(userId)}
                />
              )}
            </div>

            <PinsBar
              pins={pinsHidden ? [] : pins.pins}
              messages={messageApi.messages}
              authors={profilesById}
              onJump={jumpToMessage}
              onClose={() => setPinsHidden((value) => !value)}
            />

            <VoiceStage
              voice={voice}
              profiles={profilesById}
              myUserId={profile.id}
              onClose={voice.leave}
            />

            {voice.status === "failed" && voice.error ? (
              <VoiceError
                message={voice.error}
                onRetry={() => {
                  if (voice.channelId) void voice.join(voice.channelId);
                }}
                onDismiss={voice.leave}
              />
            ) : null}

            <Composer
              disabled={!channelAllows("SEND_MESSAGES")}
              disabledReason="You don't have permission to send messages in this channel."
              canAttach={channelAllows("ATTACH_FILES")}
              uploading={uploading}
              replyTo={replyTo}
              editing={editing}
              onCancelReply={() => setReplyTo(null)}
              onCancelEdit={() => setEditing(null)}
              onSubmit={onSubmit}
              onTyping={notifyTyping}
              onPickFiles={pickFiles}
            />
          </>
        ) : null}

        {view.kind === "channel" && !activeChannelId && server ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Pick a channel to get started.
          </div>
        ) : null}

        {/* Desktop member list */}
        {server && membersVisible && view.kind !== "server-settings" ? (
          <div className="hidden lg:flex">{memberList}</div>
        ) : null}
      </main>

      {/* Mobile bottom navigation */}
      <div className="shrink-0 md:hidden">
        <Rail {...railProps} orientation="horizontal" unreadByServer={{}} />
      </div>

      {/* Dialogs */}
      <CreateServerDialog
        open={createServerOpen}
        onOpenChange={setCreateServerOpen}
        onCreated={(id) => {
          void reloadServers().then(() => selectServer(id));
        }}
      />
      <JoinServerDialog
        open={joinServerOpen}
        onOpenChange={setJoinServerOpen}
        onJoined={(id) => {
          void reloadServers().then(() => selectServer(id));
        }}
      />
      {server ? (
        <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} server={server} />
      ) : null}
      {server ? (
        <CreateChannelDialog
          open={createChannelOpen}
          onOpenChange={setCreateChannelOpen}
          serverId={server.id}
          onCreated={(channelId) => {
            void reloadChannels();
            setView({ kind: "channel", serverId: server.id, channelId, title: "" });
          }}
        />
      ) : null}
      <ProfileDialog
        open={Boolean(profileTarget)}
        onOpenChange={(open) => !open && setProfileTarget(null)}
        profile={profileTarget}
        presence={profileTarget ? (presence[profileTarget.id] ?? "offline") : "offline"}
        currentUserId={profile.id}
        onSendMessage={(userId) => void openDm(userId)}
        onAddFriend={(userId) => void addFriend(userId)}
        onBlock={(userId) => void blockUser(userId)}
      />
    </div>
  );
}

/* ------------------------------------------------------------- sub views --- */

function MessageList({
  messages,
  reactions,
  profilesById,
  currentUserId,
  currentUsername,
  canManageMessages,
  canReact,
  pinnedIds,
  hasMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onTogglePin,
  onOpenProfile,
}: {
  messages: Message[];
  reactions: Reaction[];
  profilesById: Map<string, Profile>;
  currentUserId: string;
  currentUsername: string;
  canManageMessages: boolean;
  canReact: boolean;
  pinnedIds: Set<string>;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
  onTogglePin: (message: Message) => void;
  onOpenProfile: (userId: string) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const previousCount = React.useRef(messages.length);

  React.useEffect(() => {
    const container = scrollRef.current?.parentElement;
    if (!container) return;
    if (messages.length > previousCount.current) {
      container.scrollTop = container.scrollHeight;
    }
    previousCount.current = messages.length;
  }, [messages.length]);

  const byId = React.useMemo(
    () => new Map(messages.map((message) => [message.id, message])),
    [messages],
  );

  if (messages.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <MessageSquare className="size-10 text-muted-foreground/50" />
        <h2 className="text-lg font-semibold">No messages yet</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          Be the first to say hello — everything you send here is delivered live to everyone in the
          channel.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollRef}>
      {hasMore ? (
        <div className="flex justify-center p-3">
          <Button variant="outline" size="sm" onClick={onLoadMore}>
            Load earlier messages
          </Button>
        </div>
      ) : (
        <p className="px-4 pt-6 pb-2 text-xs text-muted-foreground">
          This is the very beginning of the channel.
        </p>
      )}

      {messages.map((message, index) => {
        const previous = messages[index - 1];
        const newDay =
          !previous || previous.created_at.slice(0, 10) !== message.created_at.slice(0, 10);
        const grouped =
          !newDay &&
          previous?.author_id === message.author_id &&
          new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000;

        const replyTo = message.reply_to ? byId.get(message.reply_to) ?? null : null;

        return (
          <React.Fragment key={message.id}>
            {newDay ? (
              <div className="my-4 flex items-center gap-3 px-4">
                <span className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium text-muted-foreground">
                  {formatDayDivider(message.created_at)}
                </span>
                <span className="h-px flex-1 bg-border" />
              </div>
            ) : null}
            <MessageItem
              message={message}
              author={profilesById.get(message.author_id) ?? null}
              replyTo={replyTo}
              replyAuthor={replyTo ? (profilesById.get(replyTo.author_id) ?? null) : null}
              reactions={reactions.filter((reaction) => reaction.message_id === message.id)}
              currentUserId={currentUserId}
              currentUsername={currentUsername}
              canManage={canManageMessages}
              showHeader={!grouped}
              pinned={pinnedIds.has(message.id)}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={canReact ? onReact : NOOP}
              onTogglePin={onTogglePin}
              onOpenProfile={onOpenProfile}
            />
          </React.Fragment>
        );
      })}
    </div>
  );
}

function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[0, 1, 2, 3, 4].map((index) => (
        <div key={index} className="flex gap-3">
          <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function HomePane({
  servers,
  dms,
  onlineIds,
  presence,
  onSelectServer,
  onOpenChannel,
  onCreateServer,
  onJoinServer,
  onOpenFriends,
}: {
  servers: MyServer[];
  dms: DmChannel[];
  onlineIds: string[];
  presence: Record<string, PresenceStatus>;
  onSelectServer: (id: string) => void;
  onOpenChannel: (channelId: string, title: string) => void;
  onCreateServer: () => void;
  onJoinServer: () => void;
  onOpenFriends: () => void;
}) {
  const onlineSet = React.useMemo(() => new Set(onlineIds), [onlineIds]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto w-full max-w-5xl px-6 py-10">
        <h1 className="font-display text-4xl tracking-tight">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">
          Pick up where you left off, or start something new.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card
            title="Create a server"
            body="A home for your team, with channels, roles and permissions."
            action="Create server"
            onClick={onCreateServer}
          />
          <Card
            title="Join a server"
            body="Got an invite code from a friend? Drop it in and you're in."
            action="Join with a code"
            onClick={onJoinServer}
          />
        </div>

        <section className="mt-10">
          <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Your servers
          </h2>
          {servers.length === 0 ? (
            <EmptyRow
              text="You haven't joined any servers yet."
              action="Create one"
              onClick={onCreateServer}
            />
          ) : (
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {servers.map((server) => (
                <li key={server.id}>
                  <button
                    type="button"
                    onClick={() => onSelectServer(server.id)}
                    className="group flex w-full flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {server.banner_url ? (
                      <img
                        src={server.banner_url}
                        alt=""
                        loading="lazy"
                        className="h-16 w-full object-cover"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="h-16 w-full bg-linear-to-r from-ember-500/25 via-gold-400/15 to-teal/20"
                      />
                    )}
                    <span className="flex items-center gap-3 p-3">
                      {server.icon_url ? (
                        <img
                          src={server.icon_url}
                          alt=""
                          className="size-11 shrink-0 rounded-[28%] object-cover"
                        />
                      ) : (
                        <span className="font-display flex size-11 shrink-0 items-center justify-center rounded-[28%] bg-linear-to-br from-ember-500 to-gold-400 text-lg text-white">
                          {server.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{server.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {server.member_role}
                          {server.description ? ` · ${server.description}` : ""}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Direct messages
            </h2>
            <Button size="sm" variant="ghost" onClick={onOpenFriends}>
              Find people
            </Button>
          </div>
          {dms.length === 0 ? (
            <EmptyRow text="No conversations yet." action="Find friends" onClick={onOpenFriends} />
          ) : (
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {dms.slice(0, 8).map((dm) => (
                <li key={dm.id}>
                  <button
                    type="button"
                    onClick={() => onOpenChannel(dm.id, dm.partner?.display_name ?? "Direct message")}
                    className="flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    <Avatar
                      seed={dm.partner?.id ?? dm.id}
                      name={dm.partner?.display_name ?? "Unknown"}
                      src={dm.partner?.avatar_url}
                      size={36}
                      status={
                        dm.partner
                          ? (presence[dm.partner.id] ?? (onlineSet.has(dm.partner.id) ? "online" : "offline"))
                          : "offline"
                      }
                      showStatus
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {dm.partner?.display_name ?? "Unknown member"}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        @{dm.partner?.username ?? "—"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Card({
  title,
  body,
  action,
  onClick,
}: {
  title: string;
  body: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-2xl border bg-card p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="flex items-center justify-between">
        <span className="font-medium">{title}</span>
        <Plus className="size-4 text-muted-foreground transition-transform group-hover:rotate-90" />
      </span>
      <span className="mt-1.5 block text-sm text-muted-foreground">{body}</span>
      <span className="mt-4 inline-block rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background">
        {action}
      </span>
    </button>
  );
}

function EmptyRow({ text, action, onClick }: { text: string; action: string; onClick: () => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed px-4 py-6">
      <p className="text-sm text-muted-foreground">{text}</p>
      <Button size="sm" variant="outline" onClick={onClick}>
        {action}
      </Button>
    </div>
  );
}

/* --------------------------------------------------------------- states --- */

/* Auth loading, error and "not configured" screens live in <AuthGate> so the
   /app route and any other entry point share the same behaviour. */

function SetupNotice() {
  return (
    <div className="flex h-dvh items-center justify-center bg-background p-6">
      <div className="max-w-lg rounded-2xl border bg-card p-8 text-center">
        <Compass className="mx-auto size-8 text-ember-500" />
        <h1 className="mt-4 text-xl font-semibold">Connect Supabase to get started</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Cadence stores everything in Supabase. Add these two environment variables to{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">.env.local</code> and
          restart the dev server.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-muted p-4 text-left font-mono text-xs">
{`VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key`}
        </pre>
        <p className="mt-4 text-xs text-muted-foreground">
          Then run <code className="font-mono">supabase/schema.sql</code> in the Supabase SQL editor.
        </p>
      </div>
    </div>
  );
}
