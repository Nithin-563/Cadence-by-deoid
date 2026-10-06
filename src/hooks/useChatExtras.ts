import * as React from "react";

import { supabase } from "@/lib/supabase";
import { rows, type Message, type Pin, type Profile } from "@/lib/database.types";
import { useAuth } from "@/hooks/useAuth";

/** Pins for a channel, newest first. */
export function usePins(channelId: string | null) {
  const [pins, setPins] = React.useState<Pin[]>([]);

  const reload = React.useCallback(async () => {
    if (!channelId) {
      setPins([]);
      return;
    }
    const { data, error } = await supabase
      .from("pins")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: false });
    if (error) console.error("pins failed", error);
    setPins(rows<Pin>(data));
  }, [channelId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const togglePin = React.useCallback(
    async (message: Message) => {
      const existing = pins.find((pin) => pin.message_id === message.id);
      if (existing) {
        const { error } = await supabase.from("pins").delete().eq("message_id", message.id);
        if (error) console.error("unpin failed", error);
      } else {
        const { error } = await supabase
          .from("pins")
          .insert({ message_id: message.id, channel_id: message.channel_id });
        if (error) console.error("pin failed", error);
      }
      await reload();
    },
    [reload],
  );

  return { pins, togglePin, reload };
}

export interface SearchHit extends Message {
  author: Profile | null;
}

/**
 * Full-text-ish search inside one channel, or across a whole server.
 * PostgREST `ilike` is plenty at this scale and keeps the app dependency-free.
 */
export function useMessageSearch(channelId: string | null, serverId: string | null) {
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);

  const reset = React.useCallback(() => {
    setQuery("");
    setHits([]);
    setSearching(false);
  }, []);

  const profilesById = React.useRef<Map<string, Profile>>(new Map());

  const loadProfiles = React.useCallback(async (authorIds: string[]) => {
    if (authorIds.length === 0) return;

    const existingIds = new Set(profilesById.current.keys());
    const missingIds = authorIds.filter((id) => !existingIds.has(id));

    if (missingIds.length === 0) return;

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
      .in("id", missingIds);
    for (const profile of rows<Profile>(profileData)) {
      profilesById.current.set(profile.id, profile);
    }
  }, []);

  React.useEffect(() => {
    const term = query.trim();
    // Commas, dots and wildcards are syntax to PostgREST filters.
    if (term.length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }

    setSearching(true);
    let active = true;

    const handle = window.setTimeout(async () => {
      const cleaned = term.replace(/[,()*%]/g, " ").trim().slice(0, 80);

      let channelIds: string[] = [];
      if (channelId) {
        channelIds = [channelId];
      } else if (serverId) {
        const { data } = await supabase
          .from("channels")
          .select("id")
          .eq("server_id", serverId);
        channelIds = rows<{ id: string }>(data).map((c) => c.id);
      }
      if (channelIds.length === 0) {
        if (active) {
          setHits([]);
          setSearching(false);
        }
        return;
      }

      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .in("channel_id", channelIds)
        .ilike("content", `%${cleaned}%`)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!active) return;
      if (error) console.error("message search failed", error);

      const messages = rows<Message>(data);
      const authorIds = [...new Set(messages.map((message) => message.author_id))];

      await loadProfiles(authorIds);

      if (!active) return;
      setHits(messages.map((message) => ({ ...message, author: profilesById.current.get(message.author_id) ?? null })));
      setSearching(false);
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(handle);
    };
  }, [query, channelId, serverId, loadProfiles]);

  return { query, setQuery, hits, searching, reset };
}

/**
 * Split message text into plain and @mentioned segments so mentions can be
 * highlighted without ever injecting markup.
 */
export function useMentionHighlight(content: string, myUsername?: string): { text: string; mention: boolean }[] {
  return React.useMemo(() => {
    if (!myUsername) return [{ text: content, mention: false }];

    const pattern = new RegExp(`(^|\\s)@${escapeRegExp(myUsername)}\\b`, "gi");
    const parts: { text: string; mention: boolean }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(content)) !== null) {
      const start = match.index + match[1].length;
      if (start > lastIndex) {
        parts.push({ text: content.slice(lastIndex, start), mention: false });
      }
      parts.push({ text: content.slice(start, pattern.lastIndex), mention: true });
      lastIndex = pattern.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({ text: content.slice(lastIndex), mention: false });
    }
    return parts.length > 0 ? parts : [{ text: content, mention: false }];
  }, [content, myUsername]);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Convenience: the signed-in user's id and username together. */
export function useMe() {
  const { user, profile } = useAuth();
  return { userId: user?.id, username: profile?.username };
}