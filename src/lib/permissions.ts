/**
 * Permission bitfield helpers — the client-side mirror of `perm_bit()` in
 * `supabase/schema.sql`. Keep the two in sync.
 */

export const PERMISSIONS = {
  ADMINISTRATOR: 1 << 0,
  MANAGE_SERVER: 1 << 1,
  MANAGE_CHANNELS: 1 << 2,
  MANAGE_ROLES: 1 << 3,
  CREATE_INVITE: 1 << 4,
  KICK_MEMBERS: 1 << 5,
  BAN_MEMBERS: 1 << 6,
  CHANGE_NICKNAME: 1 << 7,
  VIEW_CHANNEL: 1 << 10,
  SEND_MESSAGES: 1 << 11,
  MANAGE_MESSAGES: 1 << 13,
  EMBED_LINKS: 1 << 14,
  ATTACH_FILES: 1 << 15,
  ADD_REACTIONS: 1 << 17,
  MENTION_EVERYONE: 1 << 18,
} as const;

export type PermissionName = keyof typeof PERMISSIONS;

/** `-1` means "every bit" (owner / administrator). */
export const ALL_PERMISSIONS = -1;

/** Default @everyone permission set — matches `default_everyone_permissions()`. */
export const DEFAULT_EVERYONE_PERMISSIONS =
  PERMISSIONS.VIEW_CHANNEL |
  PERMISSIONS.SEND_MESSAGES |
  PERMISSIONS.EMBED_LINKS |
  PERMISSIONS.ATTACH_FILES |
  PERMISSIONS.ADD_REACTIONS;

export function hasPermission(mask: number, permission: PermissionName): boolean {
  if (mask === ALL_PERMISSIONS) return true;
  return (mask & PERMISSIONS[permission]) !== 0;
}

export function hasAnyPermission(mask: number, permissions: PermissionName[]): boolean {
  if (mask === ALL_PERMISSIONS) return true;
  return permissions.some((permission) => (mask & PERMISSIONS[permission]) !== 0);
}

export function withPermission(mask: number, permission: PermissionName, granted: boolean): number {
  if (mask === ALL_PERMISSIONS) return mask;
  return granted ? mask | PERMISSIONS[permission] : mask & ~PERMISSIONS[permission];
}

export function maskToNames(mask: number): PermissionName[] {
  if (mask === ALL_PERMISSIONS) return Object.keys(PERMISSIONS) as PermissionName[];
  return (Object.keys(PERMISSIONS) as PermissionName[]).filter((name) => (mask & PERMISSIONS[name]) !== 0);
}

/** Human labels for the permission editor UI. */
export const PERMISSION_LABELS: Record<PermissionName, { label: string; group: string; help: string }> = {
  ADMINISTRATOR: {
    label: "Administrator",
    group: "General permissions",
    help: "Grants every permission and bypasses all channel overrides.",
  },
  MANAGE_SERVER: {
    label: "Manage server",
    group: "General permissions",
    help: "Change the server name, icon and description.",
  },
  MANAGE_CHANNELS: {
    label: "Manage channels",
    group: "General permissions",
    help: "Create, rename, reorder and delete channels.",
  },
  MANAGE_ROLES: {
    label: "Manage roles",
    group: "General permissions",
    help: "Create and edit roles and their permissions.",
  },
  CREATE_INVITE: {
    label: "Create invite",
    group: "Membership permissions",
    help: "Generate new invite links for this server.",
  },
  KICK_MEMBERS: {
    label: "Kick members",
    group: "Membership permissions",
    help: "Remove members from the server.",
  },
  BAN_MEMBERS: {
    label: "Ban members",
    group: "Membership permissions",
    help: "Permanently ban members from rejoining.",
  },
  CHANGE_NICKNAME: {
    label: "Change nicknames",
    group: "Membership permissions",
    help: "Change other members' nicknames.",
  },
  VIEW_CHANNEL: {
    label: "View channels",
    group: "Text permissions",
    help: "See channels by default.",
  },
  SEND_MESSAGES: {
    label: "Send messages",
    group: "Text permissions",
    help: "Post new messages in text channels.",
  },
  MANAGE_MESSAGES: {
    label: "Manage messages",
    group: "Text permissions",
    help: "Edit and delete messages from other members.",
  },
  EMBED_LINKS: {
    label: "Embed links",
    group: "Text permissions",
    help: "Links posted by this role unfurl with a preview.",
  },
  ATTACH_FILES: {
    label: "Attach files",
    group: "Text permissions",
    help: "Upload files and images.",
  },
  ADD_REACTIONS: {
    label: "Add reactions",
    group: "Text permissions",
    help: "React to messages with emoji.",
  },
  MENTION_EVERYONE: {
    label: "Mention @everyone",
    group: "Text permissions",
    help: "Notify the whole server at once.",
  },
};

/** Colour swatches offered in the role editor. */
export const ROLE_COLORS = [
  "#9ca3af",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
] as const;
