import * as React from "react";

import { supabase } from "@/lib/supabase";
import { rows, row, type Channel, type MemberRole, type MyServer, type Profile, type Role, type ServerMember } from "@/lib/database.types";
import { useAuth } from "@/hooks/useAuth";

/* -------------------------------------------------------------- servers --- */

export function useMyServers() {
  const { user } = useAuth();
  const [servers, setServers] = React.useState<MyServer[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    const { data, error } = await supabase.rpc("my_servers");
    if (error) {
      console.error("my_servers failed", error);
      setServers([]);
      return;
    }
    setServers(rows<MyServer>(data));
  }, []);

  React.useEffect(() => {
    if (!user) {
      setServers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    void reload();
  }, [user, reload]);

  // Keep the rail in sync when someone adds you to a server elsewhere.
  React.useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("cadence:my-servers")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `user_id=eq.${user.id}` },
        () => void reload(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [user, reload]);

  return { servers, loading, reload };
}

/* ------------------------------------------------------------- channels --- */

export function useServerChannels(serverId: string | null) {
  const [channels, setChannels] = React.useState<Channel[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!serverId) {
      setChannels([]);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("channels")
      .select("*")
      .eq("server_id", serverId)
      .order("position", { ascending: true });
    if (error) {
      console.error("channels failed", error);
      setChannels([]);
      return;
    }
    setChannels(rows<Channel>(data));
    setLoading(false);
  }, [serverId]);

  React.useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`cadence:channels:${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "channels", filter: `server_id=eq.${serverId}` },
        () => void reload(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [serverId, reload]);

  return { channels, loading, reload };
}

export interface DmChannel extends Channel {
  /** The other participant (for 1:1 DMs). */
  partner: Profile | null;
}

/** Every DM the user is a member of, newest activity first. */
export function useDirectChannels() {
  const { user } = useAuth();
  const [channels, setChannels] = React.useState<DmChannel[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!user) {
      setChannels([]);
      setLoading(false);
      return;
    }

    const { data: memberships, error: memberError } = await supabase
      .from("channel_members")
      .select("channel_id")
      .eq("user_id", user.id);

    if (memberError) {
      console.error("dm memberships failed", memberError);
      setChannels([]);
      return;
    }

    const ids = rows<{ channel_id: string }>(memberships).map((m) => m.channel_id);
    if (ids.length === 0) {
      setChannels([]);
      setLoading(false);
      return;
    }

    const { data: channelData, error: channelError } = await supabase
      .from("channels")
      .select("*")
      .in("id", ids)
      .eq("kind", "dm");

    if (channelError) {
      console.error("dm channels failed", channelError);
      setChannels([]);
      return;
    }

    const dmChannels = rows<Channel>(channelData);
    const partners = await fetchDmPartners(dmChannels, user.id);

    setChannels(
      dmChannels
        .map((channel) => ({ ...channel, partner: partners.get(channel.id) ?? null }))
        .sort((a, b) => (b.last_message_at ?? b.created_at).localeCompare(a.last_message_at ?? a.created_at)),
    );
    setLoading(false);
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    setLoading(true);
    void reload();
  }, [user, reload]);

  React.useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("cadence:my-dms")
      .on("postgres_changes", { event: "*", schema: "public", table: "channel_members", filter: `user_id=eq.${user.id}` }, () => void reload())
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => void reload())
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [user, reload]);

  return { channels, loading, reload };
}

async function fetchDmPartners(channels: Channel[], me: string): Promise<Map<string, Profile>> {
  if (channels.length === 0) return new Map();
  const { data } = await supabase
    .from("channel_members")
    .select("channel_id, user_id, profiles(id, username, display_name, avatar_url)")
    .in("channel_id", channels.map((c) => c.id))
    .neq("user_id", me);

  const map = new Map<string, Profile>();
  for (const entry of rows<{ channel_id: string; user_id: string; profiles: unknown }>(data)) {
    const profile = row<Profile>(entry.profiles);
    if (profile) map.set(entry.channel_id, profile);
  }
  return map;
}

/* -------------------------------------------------------------- members --- */

export interface Member extends Profile {
  nickname: string | null;
  joinedAt: string;
  roleIds: string[];
}

export function useServerMembers(serverId: string | null) {
  const [members, setMembers] = React.useState<Member[]>([]);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [memberRoles, setMemberRoles] = React.useState<MemberRole[]>([]);
  const [loading, setLoading] = React.useState(true);

  const reload = React.useCallback(async () => {
    if (!serverId) {
      setMembers([]);
      setRoles([]);
      setMemberRoles([]);
      setLoading(false);
      return;
    }

    const [memberRes, roleRes, memberRoleRes] = await Promise.all([
      supabase.from("server_members").select("*").eq("server_id", serverId),
      supabase.from("roles").select("*").eq("server_id", serverId).order("position", { ascending: false }),
      supabase.from("member_roles").select("*").eq("server_id", serverId),
    ]);

    if (memberRes.error) console.error("server_members failed", memberRes.error);
    if (roleRes.error) console.error("roles failed", roleRes.error);
    if (memberRoleRes.error) console.error("member_roles failed", memberRoleRes.error);

    const memberRows = rows<ServerMember>(memberRes.data);
    const roleRows = rows<Role>(roleRes.data);
    const memberRoleRows = rows<MemberRole>(memberRoleRes.data);

    const profilesById = new Map<string, Member>();
    if (memberRows.length > 0) {
      const ids = memberRows.map((m) => m.user_id);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
        .in("id", ids);
      for (const profile of rows<Profile>(profileData)) {
        const membership = memberRows.find((m) => m.user_id === profile.id);
        profilesById.set(profile.id, {
          ...profile,
          nickname: membership?.nickname ?? null,
          joinedAt: membership?.joined_at ?? profile.created_at,
          roleIds: [],
        });
      }
    }

    setMembers([...profilesById.values()]);
    setRoles(roleRows);
    setMemberRoles(memberRoleRows);
    setLoading(false);
  }, [serverId]);

  React.useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`cadence:members:${serverId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${serverId}` },
        () => void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "member_roles", filter: `server_id=eq.${serverId}` },
        () => void reload(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [serverId, reload]);

  // Attach role ids last so the render only depends on the three source lists.
  const membersWithRoles = React.useMemo(
    () =>
      members.map((member) => ({
        ...member,
        roleIds: memberRoleRowsFor(member.user_id),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members, memberRoles],
  );

  function memberRoleRowsFor(userId: string): string[] {
    return memberRoles.filter((r) => r.user_id === userId).map((r) => r.role_id);
  }

  return { members: membersWithRoles, roles, memberRoles, loading, reload };
}

/* -------------------------------------------------------------- unread --- */

export interface RecentMessage {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface UnreadState {
  /** Channel id -> messages since the user last opened it. */
  counts: Record<string, number>;
  /** Channels where the user was @mentioned after last reading. */
  mentions: Set<string>;
  /** Total unread in the server currently open (0 when no server is open). */
  serverTotal: number;
}

/** Only look back a fortnight — older messages don't drive a badge. */
const UNREAD_WINDOW_DAYS = 14;

/**
 * Unread counts and @mentions for the open server plus every DM.
 *
 * A channel that has never been opened has no `channel_reads` row, so we skip
 * it — otherwise every badge would light up on first load.
 */
export function useUnread(
  serverId: string | null,
  dmChannelIds: string[],
  myUserId: string | undefined,
  myUsername: string | undefined,
): UnreadState {
  const [state, setState] = React.useState<UnreadState>({
    counts: {},
    mentions: new Set(),
    serverTotal: 0,
  });

  const channelKey = dmChannelIds.join(",");
  const mentionPattern = React.useMemo(
    () => (myUsername ? new RegExp(`(^|\\s)@${escapeRegExp(myUsername)}\\b`, "i") : null),
    [myUsername],
  );

  React.useEffect(() => {
    if (!myUserId) {
      setState({ counts: {}, mentions: new Set(), serverTotal: 0 });
      return;
    }

    let active = true;

    void (async () => {
      const channelIds = [...dmChannelIds];

      if (serverId) {
        const { data } = await supabase
          .from("channels")
          .select("id")
          .eq("server_id", serverId);
        for (const channel of rows<{ id: string }>(data)) channelIds.push(channel.id);
      }

      if (channelIds.length === 0) {
        if (active) setState({ counts: {}, mentions: new Set(), serverTotal: 0 });
        return;
      }

      const since = new Date(
        Date.now() - UNREAD_WINDOW_DAYS * 24 * 60 * 60 * 1000,
      ).toISOString();

      const [readsResult, messagesResult] = await Promise.all([
        supabase
          .from("channel_reads")
          .select("channel_id, last_read_at")
          .eq("user_id", myUserId)
          .in("channel_id", channelIds),
        supabase
          .from("messages")
          .select("id, channel_id, author_id, content, created_at")
          .in("channel_id", channelIds)
          .gte("created_at", since)
          .is("deleted_at", null)
          .order("created_at", { ascending: true })
          .limit(2000),
      ]);

      if (!active) return;

      const lastReadAt = new Map<string, string>();
      for (const read of rows<{ channel_id: string; last_read_at: string }>(readsResult.data)) {
        lastReadAt.set(read.channel_id, read.last_read_at);
      }

      const counts: Record<string, number> = {};
      const mentions = new Set<string>();

      for (const message of rows<RecentMessage>(messagesResult.data)) {
        if (message.author_id === myUserId) continue;

        const marker = lastReadAt.get(message.channel_id);
        if (!marker || message.created_at <= marker) continue;

        counts[message.channel_id] = (counts[message.channel_id] ?? 0) + 1;
        if (mentionPattern?.test(message.content)) {
          mentions.add(message.channel_id);
        }
      }

      const serverTotal = Object.entries(counts).reduce((total, [channelId, count]) => {
        // DMs live outside any server, so exclude them from the server badge.
        if (dmChannelIds.includes(channelId)) return total;
        return total + count;
      }, 0);

      setState({ counts, mentions, serverTotal });
    })();

    return () => {
      active = false;
    };
  }, [serverId, channelKey, myUserId, mentionPattern]);

  return state;
}

/** Record that the user has read a channel up to now. */
export async function markChannelRead(channelId: string, userId: string) {
  const { error } = await supabase.from("channel_reads").upsert({
    channel_id: channelId,
    user_id: userId,
    last_read_at: new Date().toISOString(),
  });
  if (error) console.error("markChannelRead failed", error);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* -------------------------------------------------------------- profile --- */

/** Count of pending friend requests addressed to the current user. */
export function useFriendRequests(): number {
  const { user } = useAuth();
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }

    const load = () => {
      supabase
        .from("friendships")
        .select("id", { count: "exact", head: true })
        .eq("addressee_id", user.id)
        .eq("status", "pending")
        .then(({ count: total, error }) => {
          if (error) console.error("friend request count failed", error);
          setCount(total ?? 0);
        });
    };

    load();

    const channel = supabase
      .channel("cadence:my-friend-requests")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "friendships", filter: `addressee_id=eq.${user.id}` },
        load,
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [user]);

  return count;
}
