/**
 * Row shapes for the Cadence schema in `supabase/schema.sql`.
 *
 * These mirror the SQL tables one-for-one. They are kept by hand (rather than
 * generated) so the app compiles without a codegen step; if you change a
 * column, update it here too.
 */

export type PresenceStatus = "online" | "idle" | "dnd" | "offline";

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  about: string;
  avatar_url: string | null;
  banner_url: string | null;
  status_text: string;
  created_at: string;
  updated_at: string;
}

export interface Server {
  id: string;
  name: string;
  description: string;
  icon_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface MyServer extends Server {
  /** From the `my_servers()` RPC. */
  member_role: "Owner" | "Member";
  /** Resolved base permission bitmask; `-1` means every permission. */
  permissions: number;
}

export interface Role {
  id: string;
  server_id: string;
  name: string;
  color: string;
  /** bigint arrives as a number over PostgREST JSON. */
  permissions: number;
  position: number;
  is_default: boolean;
  created_at: string;
}

export interface ServerMember {
  server_id: string;
  user_id: string;
  nickname: string | null;
  joined_at: string;
}

export interface MemberRole {
  server_id: string;
  user_id: string;
  role_id: string;
}

export interface Channel {
  id: string;
  server_id: string | null;
  kind: "text" | "dm";
  name: string;
  topic: string;
  position: number;
  created_by: string | null;
  created_at: string;
  last_message_at: string | null;
  dm_key: string | null;
}

export interface ChannelMember {
  channel_id: string;
  user_id: string;
}

export interface ChannelOverwrite {
  id: string;
  channel_id: string;
  role_id: string | null;
  user_id: string | null;
  allow: number;
  deny: number;
}

export interface Message {
  id: string;
  channel_id: string;
  author_id: string;
  content: string;
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
  attachments: Attachment[];
}

export interface Reaction {
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted";
  created_at: string;
  updated_at: string;
}

export interface ServerInvite {
  code: string;
  server_id: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  uses: number;
  created_at: string;
}

export interface ChannelRead {
  channel_id: string;
  user_id: string;
  last_read_at: string;
}

export interface Pin {
  message_id: string;
  channel_id: string;
  pinned_by: string | null;
  created_at: string;
}

export interface VoiceChannel {
  id: string;
  server_id: string;
  name: string;
  position: number;
  user_limit: number | null;
  created_by: string | null;
  created_at: string;
}

export interface VoiceState {
  channel_id: string;
  user_id: string;
  session_id: string;
  self_mute: boolean;
  self_deaf: boolean;
  joined_at: string;
}

export interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

/** A profile decorated with runtime-only presence, used across the UI. */
export interface ProfileWithPresence extends Profile {
  presence: PresenceStatus;
}

/** A server + the derived data the shell needs. */
export interface ServerBundle {
  server: MyServer;
  roles: Role[];
  members: (ServerMember & { profile: Profile })[];
}

/** Narrowing helpers for PostgREST results without resorting to `any`. */
export function rows<T>(data: unknown): T[] {
  return Array.isArray(data) ? (data as T[]) : [];
}
export function row<T>(data: unknown): T | null {
  return data && typeof data === "object" ? (data as T) : null;
}
