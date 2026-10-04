import * as React from "react";
import { Camera, ChevronRight, Plus, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { Channel, ChannelOverwrite, MyServer, Role } from "@/lib/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ChannelOverwriteEditor, useChannelOverwrites } from "@/components/app/ChannelPermissions";
import {
  PERMISSIONS,
  PERMISSION_LABELS,
  ROLE_COLORS,
  withPermission,
  type PermissionName,
} from "@/lib/permissions";
import { useAuth } from "@/hooks/useAuth";
import type { Member } from "@/hooks/useCadenceData";

type Tab = "overview" | "channels" | "roles" | "members";

interface ServerSettingsProps {
  server: MyServer;
  channels: Channel[];
  roles: Role[];
  members: Member[];
  memberRoleMap: Record<string, string[]>;
  onChanged: () => void;
  onClose: () => void;
}

export function ServerSettings({
  server,
  channels,
  roles,
  members,
  memberRoleMap,
  onChanged,
  onClose,
}: ServerSettingsProps) {
  const [tab, setTab] = React.useState<Tab>("overview");
  const canManage = server.permissions === -1 || (server.permissions & PERMISSIONS.MANAGE_SERVER) !== 0;

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "channels", label: "Channels" },
    { id: "roles", label: "Roles" },
    { id: "members", label: "Members" },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{server.name} settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only members with Manage server or Manage roles can change anything here.
          </p>
        </div>
        <Button variant="outline" onClick={onClose}>
          Done
        </Button>
      </header>

      {!canManage ? (
        <p className="mt-6 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
          You don't have permission to edit this server.
        </p>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[13rem_1fr]">
          <nav aria-label="Server settings" className="flex gap-1 overflow-x-auto lg:flex-col">
            {tabs.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => setTab(entry.id)}
                aria-current={tab === entry.id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  tab === entry.id ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent/60"
                }`}
              >
                {entry.label}
                <ChevronRight className="size-3.5 opacity-50" />
              </button>
            ))}
          </nav>

          <div className="min-w-0 space-y-6">
            {tab === "overview" ? <OverviewTab server={server} onChanged={onChanged} /> : null}
            {tab === "channels" ? (
              <ChannelsTab
                server={server}
                channels={channels}
                roles={roles}
                members={members}
                onChanged={onChanged}
              />
            ) : null}
            {tab === "roles" ? (
              <RolesTab server={server} roles={roles} onChanged={onChanged} />
            ) : null}
            {tab === "members" ? (
              <MembersTab
                server={server}
                roles={roles}
                members={members}
                memberRoleMap={memberRoleMap}
                onChanged={onChanged}
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------- overview --- */

function OverviewTab({ server, onChanged }: { server: MyServer; onChanged: () => void }) {
  const [name, setName] = React.useState(server.name);
  const [description, setDescription] = React.useState(server.description);
  const [saving, setSaving] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("servers")
      .update({ name: name.trim() || server.name, description: description.trim() })
      .eq("id", server.id);
    setSaving(false);
    setMessage(error ? error.message : "Saved.");
    if (!error) onChanged();
  };

  const uploadIcon = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("The icon must be an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage("That image is over the 5 MB limit.");
      return;
    }

    setUploading(true);
    const extension = file.name.split(".").pop() ?? "png";
    const path = `${server.id}/icon-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("server-icons")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      setUploading(false);
      setMessage(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("server-icons").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("servers")
      .update({ icon_url: urlData.publicUrl })
      .eq("id", server.id);

    setUploading(false);
    setMessage(updateError ? updateError.message : "Icon updated.");
    if (!updateError) onChanged();
  };

  return (
    <section className="space-y-5 rounded-2xl border bg-card p-6">
      <h2 className="text-sm font-semibold">Server overview</h2>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          {server.icon_url ? (
            <img
              src={server.icon_url}
              alt=""
              className="size-20 rounded-[28%] object-cover"
            />
          ) : (
            <span className="font-display flex size-20 items-center justify-center rounded-[28%] bg-linear-to-br from-ember-500 to-gold-400 text-2xl text-white">
              {server.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            aria-label="Change server icon"
            className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <Camera className="size-3.5" />
          </button>
        </div>
        <div>
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload icon"}
          </Button>
          <p className="mt-1.5 text-xs text-muted-foreground">Square images work best. Up to 5 MB.</p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadIcon(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="server-name">Server name</Label>
        <Input
          id="server-name"
          value={name}
          maxLength={64}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="server-description">Description</Label>
        <Input
          id="server-description"
          value={description}
          maxLength={300}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="What is this server for?"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {message ? <span className="text-sm text-muted-foreground">{message}</span> : null}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- channels --- */

function ChannelsTab({
  server,
  channels,
  roles,
  members,
  onChanged,
}: {
  server: MyServer;
  channels: Channel[];
  roles: Role[];
  members: Member[];
  onChanged: () => void;
}) {
  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [message, setMessage] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);
  const { overwrites, reload: reloadOverwrites } = useChannelOverwrites(server.id);

  const targets = React.useMemo(
    () => [
      ...roles
        .filter((role) => role.is_default)
        .map((role) => ({ id: role.id, role_id: role.id, user_id: null, label: "@everyone", colour: role.color })),
      ...roles
        .filter((role) => !role.is_default)
        .map((role) => ({ id: role.id, role_id: role.id, user_id: null, label: role.name, colour: role.color })),
      ...members
        .filter((member) => member.id !== server.owner_id)
        .slice(0, 25)
        .map((member) => ({
          id: member.id,
          role_id: null,
          user_id: member.id,
          label: member.nickname ?? member.display_name,
          colour: "#6b7280",
        })),
    ],
    [roles, members, server.owner_id],
  );

  const create = async () => {
    const clean = name.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "-");
    if (!clean) return;
    const { error } = await supabase.from("channels").insert({
      server_id: server.id,
      kind: "text",
      name: clean,
      position: channels.length,
      created_by: server.owner_id,
    });
    if (error) setMessage(error.message);
    else {
      setName("");
      setCreating(false);
      setMessage(null);
      onChanged();
    }
  };

  const rename = async (channel: Channel, next: string) => {
    const clean = next.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-_]/g, "-");
    if (!clean || clean === channel.name) return;
    const { error } = await supabase.from("channels").update({ name: clean }).eq("id", channel.id);
    if (error) setMessage(error.message);
    else onChanged();
  };

  const setTopic = async (channel: Channel, topic: string) => {
    await supabase.from("channels").update({ topic }).eq("id", channel.id);
    onChanged();
  };

  const move = async (channel: Channel, direction: -1 | 1) => {
    const index = channels.findIndex((c) => c.id === channel.id);
    const swapWith = channels[index + direction];
    if (!swapWith) return;
    await Promise.all([
      supabase.from("channels").update({ position: swapWith.position }).eq("id", channel.id),
      supabase.from("channels").update({ position: channel.position }).eq("id", swapWith.id),
    ]);
    onChanged();
  };

  const remove = async (channel: Channel) => {
    await supabase.from("channels").delete().eq("id", channel.id);
    onChanged();
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Text channels</h2>
        <Button size="sm" onClick={() => setCreating((value) => !value)}>
          <Plus className="size-4" /> New channel
        </Button>
      </div>

      {message ? (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {message}
        </p>
      ) : null}

      {creating ? (
        <div className="flex gap-2">
          <Input
            value={name}
            autoFocus
            placeholder="new-channel"
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void create()}
          />
          <Button onClick={create}>Create</Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : null}

      <ul className="space-y-3">
        {channels
          .filter((channel) => channel.kind === "text")
          .map((channel) => (
            <ChannelRow
              key={channel.id}
              channel={channel}
              expanded={expandedId === channel.id}
              onTogglePermissions={() =>
                setExpandedId((current) => (current === channel.id ? null : channel.id))
              }
              overwriteTargets={targets}
              overwrites={overwrites}
              onOverwritesChanged={reloadOverwrites}
              onRename={(next) => void rename(channel, next)}
              onTopic={(next) => void setTopic(channel, next)}
              onDelete={() => void remove(channel)}
              onMove={(direction) => void move(channel, direction)}
            />
          ))}
      </ul>
    </section>
  );
}

function ChannelRow({
  channel,
  expanded,
  onTogglePermissions,
  overwriteTargets,
  overwrites,
  onOverwritesChanged,
  onRename,
  onTopic,
  onDelete,
  onMove,
}: {
  channel: Channel;
  expanded: boolean;
  onTogglePermissions: () => void;
  overwriteTargets: { id: string; role_id: string | null; user_id: string | null; label: string; colour: string }[];
  overwrites: ChannelOverwrite[];
  onOverwritesChanged: () => void;
  onRename: (name: string) => void;
  onTopic: (topic: string) => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}) {
  const [name, setName] = React.useState(channel.name);
  const [topic, setTopic] = React.useState(channel.topic);

  return (
    <li className="rounded-xl border p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm text-muted-foreground">#</span>
        <Input
          value={name}
          aria-label="Channel name"
          onChange={(event) => setName(event.target.value)}
          onBlur={() => onRename(name)}
          className="h-9 max-w-56"
        />
        <Input
          value={topic}
          aria-label="Channel topic"
          placeholder="Add a topic"
          onChange={(event) => setTopic(event.target.value)}
          onBlur={() => onTopic(topic)}
          className="h-9 flex-1 min-w-40"
        />
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={onTogglePermissions} aria-label="Channel permissions">
            Permissions
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onMove(-1)} aria-label="Move up">
            ↑
          </Button>
          <Button size="sm" variant="ghost" onClick={() => onMove(1)} aria-label="Move down">
            ↓
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete} aria-label={`Delete ${channel.name}`}>
            <Trash2 className="size-4 text-destructive" />
          </Button>
        </div>
      </div>

      {expanded ? (
        <ChannelOverwriteEditor
          channelId={channel.id}
          targets={overwriteTargets}
          overwrites={overwrites}
          onChanged={onOverwritesChanged}
        />
      ) : null}
    </li>
  );
}

/* ---------------------------------------------------------------- roles --- */

function RolesTab({
  server,
  roles,
  onChanged,
}: {
  server: MyServer;
  roles: Role[];
  onChanged: () => void;
}) {
  const [selectedId, setSelectedId] = React.useState<string | null>(roles[0]?.id ?? null);
  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState("");
  const selected = roles.find((role) => role.id === selectedId) ?? null;

  React.useEffect(() => {
    if (!selectedId && roles.length > 0) setSelectedId(roles[0].id);
  }, [roles, selectedId]);

  const createRole = async () => {
    const name = newName.trim() || "new role";
    const { data, error } = await supabase
      .from("roles")
      .insert({
        server_id: server.id,
        name,
        color: ROLE_COLORS[roles.length % ROLE_COLORS.length],
        permissions: 0,
        position: (roles[0]?.position ?? 0) + 1,
      })
      .select()
      .single();
    if (error || !data) return;
    setNewName("");
    setCreating(false);
    setSelectedId((data as Role).id);
    onChanged();
  };

  const patch = async (changes: Partial<Role>) => {
    if (!selected) return;
    await supabase.from("roles").update(changes).eq("id", selected.id);
    onChanged();
  };

  const remove = async () => {
    if (!selected || selected.is_default) return;
    await supabase.from("roles").delete().eq("id", selected.id);
    setSelectedId(null);
    onChanged();
  };

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Roles</h2>
        <Button size="sm" onClick={() => setCreating((value) => !value)}>
          <Plus className="size-4" /> New role
        </Button>
      </div>

      {creating ? (
        <div className="flex gap-2">
          <Input
            value={newName}
            autoFocus
            placeholder="Moderator"
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void createRole()}
          />
          <Button onClick={createRole}>Create</Button>
          <Button variant="ghost" onClick={() => setCreating(false)}>
            Cancel
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
        <ul className="space-y-1">
          {[...roles]
            .sort((a, b) => b.position - a.position)
            .map((role) => (
              <li key={role.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(role.id)}
                  aria-current={role.id === selectedId ? "true" : undefined}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    role.id === selectedId ? "bg-accent" : "hover:bg-accent/60"
                  }`}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: role.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{role.name}</span>
                  {role.is_default ? (
                    <span className="ml-auto text-[10px] text-muted-foreground">everyone</span>
                  ) : null}
                </button>
              </li>
            ))}
        </ul>

        {selected ? (
          <RoleEditor role={selected} onPatch={patch} onDelete={remove} />
        ) : (
          <p className="text-sm text-muted-foreground">Select a role to edit its permissions.</p>
        )}
      </div>
    </section>
  );
}

function RoleEditor({
  role,
  onPatch,
  onDelete,
}: {
  role: Role;
  onPatch: (changes: Partial<Role>) => void;
  onDelete: () => void;
}) {
  const groups = React.useMemo(() => {
    const map = new Map<string, PermissionName[]>();
    for (const [name, meta] of Object.entries(PERMISSION_LABELS)) {
      const list = map.get(meta.group) ?? [];
      list.push(name as PermissionName);
      map.set(meta.group, list);
    }
    return [...map.entries()];
  }, []);

  const isAdmin = (role.permissions & PERMISSIONS.ADMINISTRATOR) !== 0;

  return (
    <div className="space-y-5 rounded-xl border p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <div className="space-y-2">
          <Label htmlFor="role-name">Role name</Label>
          <Input
            id="role-name"
            defaultValue={role.name}
            key={role.id}
            maxLength={32}
            disabled={role.is_default}
            onBlur={(event) => onPatch({ name: event.target.value.trim() || role.name })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role-color">Colour</Label>
          <div className="flex flex-wrap gap-1.5">
            {ROLE_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Set colour ${color}`}
                onClick={() => onPatch({ color })}
                className={`size-6 rounded-full transition-transform hover:scale-110 ${
                  role.color === color ? "ring-2 ring-foreground ring-offset-2 ring-offset-card" : ""
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>
      </div>

      {role.is_default ? (
        <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          @everyone applies to every member. It can't be renamed or deleted.
        </p>
      ) : null}

      {isAdmin ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Administrator grants every permission and ignores all channel overrides. Individual
          toggles are disabled until it's turned off.
        </p>
      ) : null}

      <div className="space-y-5">
        {groups.map(([group, permissions]) => (
          <fieldset key={group}>
            <legend className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              {group}
            </legend>
            <ul className="space-y-3">
              {permissions.map((name) => (
                <li key={name} className="flex items-start gap-3">
                  <Switch
                    id={`perm-${name}`}
                    checked={(role.permissions & PERMISSIONS[name]) !== 0}
                    disabled={isAdmin && name !== "ADMINISTRATOR"}
                    onCheckedChange={(checked) =>
                      onPatch({ permissions: withPermission(role.permissions, name, checked) })
                    }
                  />
                  <div className="min-w-0">
                    <Label htmlFor={`perm-${name}`} className="cursor-pointer text-sm font-normal">
                      {PERMISSION_LABELS[name].label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{PERMISSION_LABELS[name].help}</p>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>
        ))}
      </div>

      {!role.is_default ? (
        <Button variant="destructive" size="sm" onClick={onDelete}>
          <Trash2 className="size-4" /> Delete role
        </Button>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------- members --- */

function MembersTab({
  server,
  roles,
  members,
  memberRoleMap,
  onChanged,
}: {
  server: MyServer;
  roles: Role[];
  members: Member[];
  memberRoleMap: Record<string, string[]>;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const assignable = roles.filter((role) => !role.is_default);

  const toggleRole = async (userId: string, roleId: string) => {
    const current = memberRoleMap[userId] ?? [];
    if (current.includes(roleId)) {
      await supabase
        .from("member_roles")
        .delete()
        .eq("server_id", server.id)
        .eq("user_id", userId)
        .eq("role_id", roleId);
    } else {
      await supabase.from("member_roles").insert({
        server_id: server.id,
        user_id: userId,
        role_id: roleId,
      });
    }
    onChanged();
  };

  return (
    <section className="space-y-3 rounded-2xl border bg-card p-6">
      <h2 className="text-sm font-semibold">Members — {members.length}</h2>
      {assignable.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Create a role first, then assign it to members here.
        </p>
      ) : (
        <ul className="space-y-2">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              <span className="min-w-40 flex-1">
                <span className="block text-sm font-medium">
                  {member.display_name}
                  {member.id === server.owner_id ? (
                    <Badge variant="secondary" className="ml-2">
                      Owner
                    </Badge>
                  ) : null}
                </span>
                <span className="block text-xs text-muted-foreground">@{member.username}</span>
              </span>

              <div className="flex flex-wrap gap-1.5">
                {assignable.map((role) => {
                  const active = (memberRoleMap[member.id] ?? []).includes(role.id);
                  return (
                    <button
                      key={role.id}
                      type="button"
                      disabled={member.id === server.owner_id || member.id === user?.id}
                      onClick={() => void toggleRole(member.id, role.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                        active ? "text-foreground" : "text-muted-foreground hover:bg-accent"
                      }`}
                      style={active ? { borderColor: role.color, backgroundColor: `${role.color}1f` } : undefined}
                    >
                      <span
                        className="size-2 rounded-full"
                        style={{ backgroundColor: role.color }}
                        aria-hidden="true"
                      />
                      {role.name}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
