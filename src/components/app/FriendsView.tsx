import * as React from "react";
import { Check, Search, UserPlus, UserX, X } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { rows, type Friendship, type PresenceStatus, type Profile } from "@/lib/database.types";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface FriendsViewProps {
  presence: Record<string, PresenceStatus>;
  onlineIds: string[];
  onOpenDm: (userId: string) => void;
  onOpenProfile: (userId: string) => void;
  onChanged: () => void;
}

/** Directory, search, friend requests and the accepted friends list. */
export function FriendsView({
  presence = {},
  onlineIds = [],
  onOpenDm,
  onOpenProfile,
  onChanged,
}: FriendsViewProps) {
  const { user } = useAuth();
  const [query, setQuery] = React.useState("");
  const [friendships, setFriendships] = React.useState<Friendship[]>([]);
  const [directory, setDirectory] = React.useState<Profile[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);

  const onlineSet = React.useMemo(() => new Set(onlineIds), [onlineIds]);

  const reloadFriendships = React.useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("friendships")
      .select("*")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
    if (error) console.error("friendships failed", error);
    setFriendships(rows<Friendship>(data));
  }, [user]);

  React.useEffect(() => {
    void reloadFriendships();
  }, [reloadFriendships]);

  // Debounced directory search.
  React.useEffect(() => {
    const raw = query.trim();
    if (!raw) {
      setDirectory([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    let active = true;
    const handle = window.setTimeout(async () => {
      // PostgREST `or()` uses commas and dots as syntax, so strip them from
      // user input — otherwise a search for "a,b" is a 400.
      const cleaned = raw.replace(/[,()*%]/g, " ").trim();
      if (!cleaned) {
        if (active) {
          setDirectory([]);
          setSearching(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at",
        )
        .or(`username.ilike.%${cleaned}%,display_name.ilike.%${cleaned}%`)
        .neq("id", user?.id ?? "")
        .limit(25);

      if (!active) return;
      if (error) console.error("directory search failed", error);
      setDirectory(rows<Profile>(data));
      setSearching(false);
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, user?.id]);

  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === user?.id,
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === user?.id,
  );
  const accepted = friendships.filter((f) => f.status === "accepted");

  const relationFor = (otherId: string) =>
    friendships.find((f) => f.requester_id === otherId || f.addressee_id === otherId) ?? null;

  const sendRequest = async (otherId: string) => {
    const { error } = await supabase
      .from("friendships")
      .insert({ requester_id: user?.id, addressee_id: otherId });
    if (error) {
      // Unique pair index rejects duplicates.
      setNotice(error.message.includes("duplicate") ? "You've already sent a request." : error.message);
      return;
    }
    setNotice(null);
    await reloadFriendships();
    onChanged();
  };

  const acceptRequest = async (friendship: Friendship) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", friendship.id);
    await reloadFriendships();
    onChanged();
  };

  const removeFriend = async (friendship: Friendship) => {
    await supabase.from("friendships").delete().eq("id", friendship.id);
    await reloadFriendships();
    onChanged();
  };

  const blockUser = async (otherId: string) => {
    await supabase.from("user_blocks").upsert({ blocker_id: user?.id, blocked_id: otherId });
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(requester_id.eq.${user?.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${user?.id})`,
      );
    setNotice("Blocked. They can no longer message or find you.");
    await reloadFriendships();
    onChanged();
  };

  const statusOf = (id: string): PresenceStatus => presence[id] ?? (onlineSet.has(id) ? "online" : "offline");

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Friends</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Find people on Cadence, send requests, and start a conversation.
        </p>
      </header>

      <div className="relative mt-6">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by username or display name"
          aria-label="Search people"
          className="h-11 rounded-full pl-9"
        />
      </div>

      {notice ? (
        <p className="mt-3 rounded-lg border border-dashed bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
          {notice}
        </p>
      ) : null}

      {/* Search results */}
      {query.trim() ? (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            {searching ? "Searching…" : `${directory.length} result${directory.length === 1 ? "" : "s"}`}
          </h2>
          {directory.length === 0 && !searching ? (
            <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
              Nobody matched “{query.trim()}”.
            </p>
          ) : (
            <ul className="space-y-2">
              {directory.map((person) => {
                const relation = relationFor(person.id);
                return (
                  <li
                    key={person.id}
                    className="flex flex-wrap items-center gap-3 rounded-xl border bg-card p-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenProfile(person.id)}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                    >
                      <Avatar
                        seed={person.id}
                        name={person.display_name}
                        src={person.avatar_url}
                        size={44}
                        status={statusOf(person.id)}
                        showStatus
                      />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{person.display_name}</span>
                        <span className="block truncate text-sm text-muted-foreground">
                          @{person.username}
                        </span>
                        {person.about ? (
                          <span className="block truncate text-xs text-muted-foreground/80">
                            {person.about}
                          </span>
                        ) : null}
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      {relation?.status === "accepted" ? (
                        <>
                          <Badge variant="secondary">
                            <Check className="size-3" /> Friends
                          </Badge>
                          <Button size="sm" onClick={() => onOpenDm(person.id)}>
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Remove ${person.display_name} as a friend`}
                            onClick={() => void removeFriend(relation)}
                          >
                            <UserX className="size-4" />
                          </Button>
                        </>
                      ) : relation?.status === "pending" ? (
                        <Badge variant="outline">
                          {relation.requester_id === user?.id ? "Request sent" : "Wants to connect"}
                        </Badge>
                      ) : (
                        <Button size="sm" onClick={() => void sendRequest(person.id)}>
                          <UserPlus className="size-4" /> Add friend
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label={`Block ${person.display_name}`}
                        onClick={() => void blockUser(person.id)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {/* Requests */}
      {!query.trim() && incoming.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Requests — {incoming.length}
          </h2>
          <ul className="space-y-2">
            {incoming.map((friendship) => (
              <IncomingRequest
                key={friendship.id}
                friendship={friendship}
                onAccept={() => void acceptRequest(friendship)}
                onDecline={() => void removeFriend(friendship)}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {!query.trim() && outgoing.length > 0 ? (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            Sent requests — {outgoing.length}
          </h2>
          <ul className="space-y-2">
            {outgoing.map((friendship) => (
              <IncomingRequest
                key={friendship.id}
                friendship={friendship}
                onAccept={() => void removeFriend(friendship)}
                onDecline={() => void removeFriend(friendship)}
                cancelLabel="Cancel"
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* Friends */}
      {!query.trim() ? (
        <section className="mt-8">
          <h2 className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
            All friends — {accepted.length}
          </h2>
          {accepted.length === 0 ? (
            <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              No friends yet. Search for a username above to get started.
            </p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {accepted.map((friendship) => {
                const otherId =
                  friendship.requester_id === user?.id
                    ? friendship.addressee_id
                    : friendship.requester_id;
                return (
                  <FriendCard
                    key={friendship.id}
                    userId={otherId}
                    presence={statusOf(otherId)}
                    onMessage={() => onOpenDm(otherId)}
                    onOpen={() => onOpenProfile(otherId)}
                  />
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}

function IncomingRequest({
  friendship,
  onAccept,
  onDecline,
  cancelLabel,
}: {
  friendship: Friendship;
  onAccept: () => void;
  onDecline: () => void;
  cancelLabel?: string;
}) {
  const otherId = friendship.requester_id;
  const [person, setPerson] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
      .eq("id", otherId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setPerson(data as Profile);
      });
    return () => {
      active = false;
    };
  }, [otherId]);

  if (!person) return null;

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <Avatar seed={person.id} name={person.display_name} src={person.avatar_url} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{person.display_name}</p>
        <p className="truncate text-sm text-muted-foreground">@{person.username}</p>
      </div>
      <Button size="sm" onClick={onAccept}>
        {cancelLabel ?? "Accept"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onDecline}>
        {cancelLabel ? "Cancel" : "Ignore"}
      </Button>
    </li>
  );
}

function FriendCard({
  userId,
  presence,
  onMessage,
  onOpen,
}: {
  userId: string;
  presence: PresenceStatus;
  onMessage: () => void;
  onOpen: () => void;
}) {
  const [person, setPerson] = React.useState<Profile | null>(null);

  React.useEffect(() => {
    let active = true;
    supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setPerson(data as Profile);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  if (!person) return null;

  return (
    <li className="flex items-center gap-3 rounded-xl border bg-card p-3">
      <button type="button" onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <Avatar
          seed={person.id}
          name={person.display_name}
          src={person.avatar_url}
          size={40}
          status={presence}
          showStatus
        />
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{person.display_name}</span>
          <span className="block truncate text-xs text-muted-foreground">@{person.username}</span>
        </span>
      </button>
      <Button size="sm" variant="outline" onClick={onMessage}>
        Message
      </Button>
    </li>
  );
}
