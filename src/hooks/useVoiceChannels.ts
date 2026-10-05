import * as React from "react";

import { supabase } from "@/lib/supabase";
import { rows, type Profile, type VoiceChannel, type VoiceState } from "@/lib/database.types";
import { useAuth } from "@/hooks/useAuth";

/** Voice channels for a server, plus who is currently connected to each. */
export function useVoiceChannels(serverId: string | null) {
  const { user } = useAuth();
  const [channels, setChannels] = React.useState<VoiceChannel[]>([]);
  const [occupants, setOccupants] = React.useState<Record<string, VoiceOccupant[]>>({});
  const [loading, setLoading] = React.useState(true);
  /** True when the voice schema hasn't been applied to the project yet. */
  const [schemaMissing, setSchemaMissing] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!serverId) {
      setChannels([]);
      setOccupants({});
      setLoading(false);
      return;
    }

    const [channelRes, stateRes] = await Promise.all([
      supabase
        .from("voice_channels")
        .select("*")
        .eq("server_id", serverId)
        .order("position", { ascending: true }),
      supabase.from("voice_states").select("*"),
    ]);

    if (channelRes.error) {
      console.error("voice_channels failed", channelRes.error);
      // PGRST205 means the table doesn't exist — the voice migration hasn't
      // been applied. Surface that instead of looking like "no channels".
      setSchemaMissing(
        channelRes.error.code === "PGRST205" ||
          channelRes.error.message.toLowerCase().includes("does not exist"),
      );
    } else {
      setSchemaMissing(false);
    }

    const list = rows<VoiceChannel>(channelRes.data);
    setChannels(list);

    if (stateRes.error) {
      console.error("voice_states failed", stateRes.error);
      setOccupants({});
    } else {
      // voice_states is server-wide by channel id; keep only this server's.
      const allowed = new Set(list.map((channel) => channel.id));
      const grouped: Record<string, VoiceOccupant[]> = {};

      for (const state of rows<VoiceState>(stateRes.data)) {
        if (!allowed.has(state.channel_id)) continue;
        grouped[state.channel_id] = grouped[state.channel_id] ?? [];
        grouped[state.channel_id].push({
          userId: state.user_id,
          sessionId: state.session_id,
          muted: state.self_mute,
          deafened: state.self_deaf,
        });
      }
      setOccupants(grouped);
    }

    setLoading(false);
  }, [serverId]);

  React.useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  React.useEffect(() => {
    if (!serverId) return;
    const channel = supabase
      .channel(`cadence:voice-presence:${serverId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "voice_states" }, () =>
        void reload(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "voice_channels", filter: `server_id=eq.${serverId}` },
        () => void reload(),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [serverId, reload]);

  /** Publish this user's presence in a voice channel. */
  const setPresence = React.useCallback(
    async (channelId: string | null, sessionId: string, flags: { muted: boolean; deafened: boolean }) => {
      if (!user?.id) return;

      if (!channelId) {
        await supabase.from("voice_states").delete().eq("user_id", user.id);
        return;
      }

      const { error } = await supabase.from("voice_states").upsert({
        channel_id: channelId,
        user_id: user.id,
        session_id: sessionId,
        self_mute: flags.muted,
        self_deaf: flags.deafened,
      });
      if (error) console.error("voice_states upsert failed", error);
    },
    [user?.id],
  );

  const create = React.useCallback(
    async (name: string) => {
      if (!serverId || !user?.id) return null;
      const { data, error } = await supabase
        .from("voice_channels")
        .insert({ server_id: serverId, name, created_by: user.id })
        .select()
        .single();
      if (error) {
        console.error("create voice channel failed", error);
        return null;
      }
      return (data as VoiceChannel).id;
    },
    [serverId, user?.id],
  );

  const rename = React.useCallback(async (id: string, name: string) => {
    const { error } = await supabase.from("voice_channels").update({ name }).eq("id", id);
    if (error) console.error("rename voice channel failed", error);
  }, []);

  const remove = React.useCallback(async (id: string) => {
    await supabase.from("voice_channels").delete().eq("id", id);
  }, []);

  return { channels, occupants, loading, schemaMissing, reload, setPresence, create, rename, remove };
}

export interface VoiceOccupant {
  userId: string;
  sessionId: string;
  muted: boolean;
  deafened: boolean;
}

/** Resolve occupant ids to profiles so names render in the voice list. */
export function useOccupantProfiles(occupants: Record<string, VoiceOccupant[]>): Profile[] {
  const ids = React.useMemo(
    () => [...new Set(Object.values(occupants).flat().map((entry) => entry.userId))],
    [occupants],
  );
  const key = ids.join(",");
  const [profiles, setProfiles] = React.useState<Profile[]>([]);

  React.useEffect(() => {
    let active = true;
    const list = key ? key.split(",").filter(Boolean) : [];
    if (list.length === 0) {
      setProfiles([]);
      return;
    }
    supabase
      .from("profiles")
      .select("id, username, display_name, about, avatar_url, banner_url, status_text, created_at, updated_at")
      .in("id", list)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) console.error("occupant profiles failed", error);
        setProfiles(rows<Profile>(data));
      });
    return () => {
      active = false;
    };
  }, [key]);

  return profiles;
}
