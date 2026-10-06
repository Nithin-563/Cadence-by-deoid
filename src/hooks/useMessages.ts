import * as React from "react";

import { supabase } from "@/lib/supabase";
import { rows, row, type Attachment, type Message, type Reaction } from "@/lib/database.types";
import { useAuth } from "@/hooks/useAuth";

const PAGE_SIZE = 40;
export interface SendPayload {
  content: string;
  replyTo?: string | null;
  attachments?: Attachment[];
}

export function useMessages(channelId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [reactions, setReactions] = React.useState<Reaction[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(true);
  const [sending, setSending] = React.useState(false);

  // Guards against a slow first page landing after we've already switched channel.
  const channelRef = React.useRef<string | null>(null);
  // Lets the poll read the newest message without re-subscribing on every send.
  const messagesRef = React.useRef<Message[]>([]);
  messagesRef.current = messages;

   const loadReactions = React.useCallback(async (ids: string[]) => {
     if (ids.length === 0) {
       setReactions([]);
       return;
     }
     const { data, error } = await supabase.from("reactions").select("*").in("message_id", ids);
     if (error) console.error("reactions failed", error);
     setReactions(rows<Reaction>(data));
   }, []);

   // Reaction toggle function with proper state synchronization
   const toggleReaction = React.useCallback(
     async (messageId: string, emoji: string) => {
       if (!user) return;
       // Optimistic UI update to prevent flickering
       const optimisticKey = `${messageId}-${emoji}`;
       setReactions((current) => {
         const existing = current.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
         if (existing) {
           return current.filter((r) => r.message_id !== messageId || r.user_id !== user.id || r.emoji !== emoji);
         } else {
           return [...current, { message_id: messageId, user_id: user.id, emoji }];
         }
       });

       try {
         const existing = reactions.find((r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji);
         if (existing) {
           const { error } = await supabase
             .from("reactions")
             .delete()
             .eq("message_id", messageId)
             .eq("user_id", user.id)
             .eq("emoji", emoji);
           if (error) {
             console.error("unreact failed", error);
             // Rollback optimistic update
             setReactions((current) => current.filter((r) => !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)));
           }
         } else {
           const { error } = await supabase
             .from("reactions")
             .insert({ message_id: messageId, user_id: user.id, emoji });
           if (error) {
             console.error("react failed", error);
             // Rollback optimistic update
             setReactions((current) => current.filter((r) => !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)));
           }
         }
       } catch (error) {
         console.error("reaction error", error);
         // Rollback optimistic update on error
         setReactions((current) => current.filter((r) => !(r.message_id === messageId && r.user_id === user.id && r.emoji === emoji)));
       }
     },
     [user, reactions, setReactions],
   );

  const fetchPage = React.useCallback(
    async (target: string, before?: string) => {
      let query = supabase
        .from("messages")
        .select("*")
        .eq("channel_id", target)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);

      if (before) query = query.lt("created_at", before);

      const { data, error } = await query;
      if (error) {
        console.error("messages failed", error);
        return [];
      }

      const page = rows<Message>(data);
      return page;
    },
    [],
  );

  // Initial load + reset when the channel changes.
  React.useEffect(() => {
    channelRef.current = channelId;
    if (!channelId) {
      setMessages([]);
      setReactions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setHasMore(true);
    let active = true;

    void (async () => {
      const page = await fetchPage(channelId);
      if (!active || channelRef.current !== channelId) return;
      page.reverse();
      setMessages(page);
      setHasMore(page.length >= PAGE_SIZE);
      setLoading(false);
      if (page.length > 0) void loadReactions(page.map((m) => m.id));
    })();

    return () => {
      active = false;
    };
  }, [channelId, fetchPage, loadReactions]);

  // Realtime: append new messages, patch edits, drop deletions.
  //
  // Realtime is the fast path, not the only path. Two things make this
  // resilient rather than fragile:
  //   1. realtimeStatus is tracked so the UI can show when it's degraded
  //   2. a poll below guarantees new messages still arrive if the socket
  //      doesn't (blocked WebSocket, corporate proxy, asleep tab)
  const [realtimeStatus, setRealtimeStatus] = React.useState<
    "connecting" | "live" | "polling" | "offline"
  >("connecting");

  React.useEffect(() => {
    if (!channelId || !user) {
      setRealtimeStatus("offline");
      return;
    }

    const channel = supabase
      .channel(`cadence:messages:${channelId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const incoming = row<Message>(payload.new);
          if (!incoming || incoming.deleted_at) return;
          setMessages((current) => {
            if (current.some((m) => m.id === incoming.id)) return current;
            const next = [...current, incoming].sort((a, b) =>
              a.created_at.localeCompare(b.created_at),
            );
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const updated = row<Message>(payload.new);
          if (!updated) return;
          setMessages((current) =>
            updated.deleted_at
              ? current.filter((m) => m.id !== updated.id)
              : current.map((m) => (m.id === updated.id ? { ...m, ...updated } : m)),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel_id=eq.${channelId}` },
        (payload) => {
          const removed = row<Message>(payload.old);
          if (!removed) return;
          setMessages((current) => current.filter((m) => m.id !== removed.id));
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reactions" },
        () => {
          setMessages((current) => {
            void loadReactions(current.map((m) => m.id));
            return current;
          });
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") setRealtimeStatus("live");
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          setRealtimeStatus("polling");
        }
      });

    return () => void supabase.removeChannel(channel);
  }, [channelId, user, loadReactions]);

  /* --------------------------------------------------------------- poll --- */
  // Safety net. If the socket is blocked or the tab was asleep, this picks up
  // anything that arrived while we weren't listening.
  React.useEffect(() => {
    if (!channelId || !user) return;

    let cancelled = false;

    const tick = async () => {
      const latest = messagesRef.current[messagesRef.current.length - 1];
      if (!latest) return;

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("channel_id", channelId)
        .is("deleted_at", null)
        .gt("created_at", latest.created_at)
        .order("created_at", { ascending: true })
        .limit(100);

      if (cancelled || error) return;
      const fresh = rows<Message>(data);
      if (fresh.length === 0) return;

      setMessages((current) => {
        const seen = new Set(current.map((m) => m.id));
        const additions = fresh.filter((m) => !seen.has(m.id));
        if (additions.length === 0) return current;
        return [...current, ...additions].sort((a, b) =>
          a.created_at.localeCompare(b.created_at),
        );
      });
    };

    const interval = window.setInterval(tick, 4000);
    // Also fire when the tab comes back to the foreground.
    const onVisible = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [channelId, user]);

  // Opening a channel, or receiving into it, clears the unread marker.
  React.useEffect(() => {
    if (channelId && user) void markRead(channelId, user.id);
  }, [channelId, user]);

  React.useEffect(() => {
    if (!channelId || !user) return;
    const latest = messages[messages.length - 1];
    if (latest?.author_id !== user.id) void markRead(channelId, user.id);
  }, [channelId, user, messages]);

  const loadMore = React.useCallback(async () => {
    if (!channelId || !hasMore || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest) return;

    const page = await fetchPage(channelId, oldest.created_at);
    if (page.length === 0) {
      setHasMore(false);
      return;
    }
    page.reverse();
    setMessages((current) => {
      const seen = new Set(current.map((m) => m.id));
      return [...page.filter((m) => !seen.has(m.id)), ...current];
    });
    setHasMore(page.length >= PAGE_SIZE);
    if (page.length > 0) {
      void loadReactions(page.map((m) => m.id));
    }
  }, [channelId, hasMore, messages, fetchPage, loadReactions]);

  const send = React.useCallback(
    async ({ content, replyTo, attachments }: SendPayload) => {
      if (!channelId || !user) return;
      const trimmed = content.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;

      // Optimistic echo: show it immediately with a client id, then swap in
      // the real row. Waiting for the round trip is what made sending feel
      // broken even when it worked.
      const tempId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic: Message = {
        id: tempId,
        channel_id: channelId,
        author_id: user.id,
        content: trimmed,
        reply_to: replyTo ?? null,
        created_at: new Date().toISOString(),
        edited_at: null,
        deleted_at: null,
        attachments: attachments ?? [],
      };

      setMessages((current) => [...current, optimistic]);
      setSending(true);

      const { data, error } = await supabase
        .from("messages")
        .insert({
          channel_id: channelId,
          author_id: user.id,
          content: trimmed,
          reply_to: replyTo ?? null,
          attachments: attachments ?? [],
        })
        .select()
        .single();

      setSending(false);

      if (error) {
        console.error("send failed", error);
        setMessages((current) => current.filter((m) => m.id !== tempId));

        const text = `${error.message} ${error.code ?? ""}`.toLowerCase();
        if (text.includes("row-level security") || error.code === "42501") {
          throw new Error(
            "The database refused that message. You may not have permission to post here, or the schema needs updating.",
          );
        }
        if (text.includes("does not exist") || error.code === "PGRST205") {
          throw new Error(
            "The messages table is missing. Re-run supabase/schema.sql in your Supabase SQL editor.",
          );
        }
        throw new Error(`Couldn't send: ${error.message}`);
      }

      // Replace the placeholder with the row the database actually stored.
      const saved = row<Message>(data);
      setMessages((current) => {
        const withoutTemp = current.filter((m) => m.id !== tempId);
        if (saved) {
          const exists = withoutTemp.some((m) => m.id === saved.id);
          return exists
            ? withoutTemp
            : [...withoutTemp, saved].sort((a, b) => a.created_at.localeCompare(b.created_at));
        }
        return withoutTemp;
      });
    },
    [channelId, user],
  );

  const edit = React.useCallback(
    async (messageId: string, content: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ content, edited_at: new Date().toISOString() })
        .eq("id", messageId);
      if (error) console.error("edit failed", error);
    },
    [],
  );

  const remove = React.useCallback(async (messageId: string) => {
    // Soft delete keeps replies intact while hiding the content.
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", messageId);
    if (error) console.error("delete failed", error);
  }, []);

  return {
    messages,
    reactions,
    loading,
    hasMore,
    sending,
    realtimeStatus,
    loadMore,
    send,
    edit,
    remove,
    toggleReaction,
  };
}

async function markRead(channelId: string, userId: string) {
  const { error } = await supabase
    .from("channel_reads")
    .upsert({
      channel_id: channelId,
      user_id: userId,
      last_read_at: new Date().toISOString(),
    });
  if (error) console.error("markRead failed", error);
}
