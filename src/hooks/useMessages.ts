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

  const loadReactions = React.useCallback(async (ids: string[]) => {
    if (ids.length === 0) {
      setReactions([]);
      return;
    }
    const { data, error } = await supabase.from("reactions").select("*").in("message_id", ids);
    if (error) console.error("reactions failed", error);
    setReactions(rows<Reaction>(data));
  }, []);

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
  React.useEffect(() => {
    if (!channelId || !user) return;

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
              : current.map((m) => (m.id === updated.id ? updated : m)),
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
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [channelId, user, loadReactions]);

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

      setSending(true);
      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        author_id: user.id,
        content: trimmed,
        reply_to: replyTo ?? null,
        attachments: attachments ?? [],
      });
      setSending(false);
      if (error) console.error("send failed", error);
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

  const toggleReaction = React.useCallback(
    async (messageId: string, emoji: string) => {
      if (!user) return;
      const existing = reactions.find(
        (r) => r.message_id === messageId && r.user_id === user.id && r.emoji === emoji,
      );

      if (existing) {
        const { error } = await supabase
          .from("reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", user.id)
          .eq("emoji", emoji);
        if (error) console.error("unreact failed", error);
        return;
      }

      const { error } = await supabase
        .from("reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji });
      if (error) console.error("react failed", error);
    },
    [reactions, user],
  );

  return {
    messages,
    reactions,
    loading,
    hasMore,
    sending,
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
