import * as React from "react";
import { MessageSquare, Plus } from "lucide-react";

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
  useDirectChannels,
  useFriendRequests,
  useMyServers,
  useServerChannels,
  useServerMembers,
  type DmChannel,
} from "@/hooks/useCadenceData";
import { useMessages } from "@/hooks/useMessages";
import { PERMISSIONS } from "@/lib/permissions";

import { Rail } from "@/components/app/Rail";
import { DmSidebar, ServerSidebar, UserPanel } from "@/components/app/Sidebar";
import { Composer, MessageItem, formatDayDivider } from "@/components/app/Chat";
import { MemberList } from "@/components/app/MemberList";
import { FriendsView } from "@/components/app/FriendsView";
import { SettingsView } from "@/components/app/SettingsView";
import { ServerSettings } from "@/components/app/ServerSettings";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Rail
        servers={servers}
        activeServerId={server?.id ?? null}
        unreadByServer={{}}
        onSelectHome={() => setView({ kind: "home" })}
        onSelectFriends={() => setView({ kind: "friends" })}
        onSelectServer={selectServer}
        onCreateServer={() => setCreateServerOpen(true)}
        onJoinServer={() => setJoinServerOpen(true)}
        onOpenProfile={() => setView({ kind: "settings" })}
        profile={{ id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url }}
        status={presence[profile.id] ?? "online"}
      />

      {/* Sidebar */}
      <div className="flex w-60 shrink-0 flex-col">
        {server ? (
          <ServerSidebar
            server={server}
            channels={channels}
            activeChannelId={activeChannelId}
            canManageChannels={can("MANAGE_CHANNELS")}
            onSelectChannel={(id) => {
              const channel = channels.find((c) => c.id === id);
              setView({
                kind: "channel",
                serverId: server.id,
                channelId: id,
                title: channel?.name ?? "channel",
              });
            }}
            onCreateChannel={() => setCreateChannelOpen(true)}
            onOpenSettings={() => setView({ kind: "server-settings", serverId: server.id })}
            onInvite={() => setInviteOpen(true)}
            onLeave={() => void leaveServer()}
            onDeleteServer={() => void deleteServer()}
            onToggleMembers={() => setMembersVisible((value) => !value)}
            membersVisible={membersVisible}
            onlineCount={members.filter((m) => (presence[m.id] ?? "offline") !== "offline").length}
          />
        ) : (
          <DmSidebar
            dms={dms}
            friends={friends}
            pendingCount={pendingCount}
            onlineIds={onlineIds}
            presence={presence}
            activeChannelId={activeChannelId}
            onSelectDm={(id) => {
              const dm = dms.find((entry) => entry.id === id);
              setView({
                kind: "channel",
                serverId: null,
                channelId: id,
                title: dm?.partner?.display_name ?? "Direct message",
              });
            }}
            onSelectFriends={() => setView({ kind: "friends" })}
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
          onOpenSettings={() => setView({ kind: "settings" })}
          onSignOut={() => void signOut()}
        />
      </div>

      {/* Main pane */}
      <main className="flex min-w-0 flex-1 flex-col">
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
            <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/70 px-4">
              <span className="font-mono text-lg text-muted-foreground">
                {view.serverId ? "#" : "@"}
              </span>
              <h1 className="truncate text-[15px] font-semibold">
                {view.title || "channel"}
              </h1>
              {server ? (
                <span className="truncate border-l border-border pl-3 text-sm text-muted-foreground">
                  {channels.find((c) => c.id === activeChannelId)?.topic || "No topic set"}
                </span>
              ) : null}
              {typingIds.length > 0 ? (
                <span className="ml-auto truncate text-xs text-teal">
                  {typingIds.length === 1 ? "Someone is typing…" : `${typingIds.length} people are typing…`}
                </span>
              ) : null}
            </header>

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
                  canManageMessages={channelAllows("MANAGE_MESSAGES")}
                  canReact={channelAllows("ADD_REACTIONS")}
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
                  onOpenProfile={(userId) => void openUserProfile(userId)}
                />
              )}
            </div>

            <Composer
              disabled={!channelAllows("SEND_MESSAGES")}
              disabledReason="You don't have permission to send messages in this channel."
              replyTo={replyTo}
              editing={editing}
              onCancelReply={() => setReplyTo(null)}
              onCancelEdit={() => setEditing(null)}
              onSubmit={async (content) => {
                if (editing) {
                  await messageApi.edit(editing.id, content);
                  setEditing(null);
                  return;
                }
                await messageApi.send({ content, replyTo: replyTo?.id ?? null });
                setReplyTo(null);
              }}
              onTyping={notifyTyping}
            />
          </>
        ) : null}

        {view.kind === "channel" && !activeChannelId && server ? (
          <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
            Pick a channel to get started.
          </div>
        ) : null}

        {/* Member list */}
        {server && membersVisible && view.kind !== "server-settings" ? (
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
          />
        ) : null}
      </main>

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
  canManageMessages,
  canReact,
  hasMore,
  onLoadMore,
  onReply,
  onEdit,
  onDelete,
  onReact,
  onOpenProfile,
}: {
  messages: Message[];
  reactions: Reaction[];
  profilesById: Map<string, Profile>;
  currentUserId: string;
  canManageMessages: boolean;
  canReact: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (message: Message) => void;
  onReact: (messageId: string, emoji: string) => void;
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
              canManage={canManageMessages}
              showHeader={!grouped}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReact={canReact ? onReact : NOOP}
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
                    className="group flex w-full items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  >
                    {server.icon_url ? (
                      <img src={server.icon_url} alt="" className="size-11 shrink-0 rounded-[28%] object-cover" />
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
