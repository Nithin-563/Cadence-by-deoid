import * as React from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import type { PresenceStatus } from "@/lib/database.types";

const PRESENCE_TOPIC = "cadence:presence";
const TYPING_TTL_MS = 6000;
const TYPING_THROTTLE_MS = 2500;

export interface PresenceState {
  /**
   * Map of userId -> their current status. Named to match every consumer,
   * which pass it straight through as a `presence` prop.
   */
  presence: Record<string, PresenceStatus>;
  onlineIds: string[];
  setStatus: (status: PresenceStatus) => void;
}

/**
 * Broadcast presence over Supabase Realtime Presence.
 *
 * One shared channel for the whole app — everyone online joins
 * `cadence:presence` and we map the resulting key list onto statuses.
 */
export function usePresence(): PresenceState {
  const { user } = useAuth();
  const [users, setUsers] = React.useState<Record<string, PresenceStatus>>({});

  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const userIdRef = React.useRef<string | null>(null);
  const statusRef = React.useRef<PresenceStatus>("online");

  React.useEffect(() => {
    if (!user) {
      setUsers({});
      channelRef.current = null;
      userIdRef.current = null;
      return;
    }

    userIdRef.current = user.id;
    const channel = supabase.channel(PRESENCE_TOPIC, {
      config: { presence: { key: user.id } },
    });
    channelRef.current = channel;

    const readState = () => {
      const state = channel.presenceState();
      const next: Record<string, PresenceStatus> = {};
      for (const [key, entries] of Object.entries(state)) {
        const last = entries[entries.length - 1] as { status?: PresenceStatus } | undefined;
        next[key] = last?.status ?? "online";
      }
      setUsers(next);
    };

    channel
      .on("presence", { event: "sync" }, readState)
      .on("presence", { event: "join" }, readState)
      .on("presence", { event: "leave" }, readState)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ status: statusRef.current });
        }
      });

    return () => {
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [user]);

  const setStatus = React.useCallback((status: PresenceStatus) => {
    statusRef.current = status;
    const channel = channelRef.current;
    if (!channel) return;

    void channel.track({ status });

    // Presence sync events only fire on join/leave, so tell peers directly.
    void channel.send({
      type: "broadcast",
      event: "status",
      payload: { userId: userIdRef.current, status },
    });
  }, []);

  const onlineIds = React.useMemo(
    () =>
      Object.entries(users)
        .filter(([, status]) => status !== "offline")
        .map(([id]) => id),
    [users],
  );

  return { presence: users, onlineIds, setStatus };
}

/**
 * Typing indicators for a single channel, broadcast over the realtime socket.
 * Nothing is persisted — this is ephemeral by design.
 */
export function useTyping(
  channelId: string | null,
  myUserId: string | undefined,
): { typingIds: string[]; notifyTyping: () => void } {
  const [typing, setTyping] = React.useState<Record<string, number>>({});
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastSentRef = React.useRef(0);

  React.useEffect(() => {
    if (!channelId || !myUserId) {
      setTyping({});
      return;
    }

    setTyping({});

    const channel = supabase.channel(`cadence:typing:${channelId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "typing" }, ({ payload }) => {
      const sender = (payload as { userId?: string } | undefined)?.userId;
      if (!sender || sender === myUserId) return;
      setTyping((current) => ({ ...current, [sender]: Date.now() }));
    });

    void channel.subscribe();
    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [channelId, myUserId]);

  // Typing flags expire on their own, so a closed tab never leaves a ghost.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      const cutoff = Date.now() - TYPING_TTL_MS;
      setTyping((current) => {
        const next: Record<string, number> = {};
        for (const [id, at] of Object.entries(current)) {
          if (at > cutoff) next[id] = at;
        }
        return Object.keys(next).length === Object.keys(current).length ? current : next;
      });
    }, 2000);
    return () => window.clearInterval(interval);
  }, []);

  const notifyTyping = React.useCallback(() => {
    const channel = channelRef.current;
    if (!channel || !myUserId) return;

    const now = Date.now();
    if (now - lastSentRef.current < TYPING_THROTTLE_MS) return;
    lastSentRef.current = now;

    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: myUserId },
    });
  }, [myUserId]);

  const typingIds = React.useMemo(() => Object.keys(typing), [typing]);

  return { typingIds, notifyTyping };
}
