import * as React from "react";
import { Camera, Check, Copy, Trash2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import type { PresenceStatus } from "@/lib/database.types";

const STATUS_OPTIONS: { value: PresenceStatus; label: string; dot: string }[] = [
  { value: "online", label: "Online", dot: "bg-emerald-500" },
  { value: "idle", label: "Idle", dot: "bg-amber-400" },
  { value: "dnd", label: "Do not disturb", dot: "bg-red-500" },
];

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

interface SettingsViewProps {
  status: PresenceStatus;
  onStatusChange: (status: PresenceStatus) => void;
}

export function SettingsView({ status, onStatusChange }: SettingsViewProps) {
  const { profile, refreshProfile, user } = useAuth();
  const [displayName, setDisplayName] = React.useState(profile?.display_name ?? "");
  const [username, setUsername] = React.useState(profile?.username ?? "");
  const [about, setAbout] = React.useState(profile?.about ?? "");
  const [statusText, setStatusText] = React.useState(profile?.status_text ?? "");
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const fileRef = React.useRef<HTMLInputElement | null>(null);

  // Seed the form once the profile finishes loading.
  React.useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name);
    setUsername(profile.username);
    setAbout(profile.about);
    setStatusText(profile.status_text);
  }, [profile]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || profile?.display_name || "Cadence user",
        username: username.trim().toLowerCase(),
        about,
        status_text: statusText.trim(),
      })
      .eq("id", user.id);

    setSaving(false);
    if (updateError) {
      setError(
        updateError.message.includes("profiles_username_key") || updateError.message.includes("duplicate")
          ? "That username is already taken."
          : updateError.message,
      );
      return;
    }
    await refreshProfile();
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  const uploadAvatar = async (file: File) => {
    if (!user) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Avatars must be a PNG, JPEG, WebP or GIF.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("That image is over the 5 MB limit.");
      return;
    }

    setUploading(true);
    const extension = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { contentType: file.type, upsert: true });

    if (uploadError) {
      setUploading(false);
      setError(`Upload failed: ${uploadError.message}`);
      return;
    }

    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    setUploading(false);
    if (updateError) setError(updateError.message);
    else await refreshProfile();
  };

  const clearAvatar = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    await refreshProfile();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">User settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how you appear to everyone else on Cadence.
        </p>
      </header>

      {error ? (
        <p className="mt-6 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Avatar */}
      <section className="mt-8 rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Avatar</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="relative">
            <Avatar
              seed={profile?.id ?? "me"}
              name={profile?.display_name ?? "You"}
              src={profile?.avatar_url}
              size={80}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Change avatar"
              className="absolute -right-1 -bottom-1 flex size-7 items-center justify-center rounded-full border-2 border-card bg-foreground text-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <Camera className="size-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload image"}
            </Button>
            {profile?.avatar_url ? (
              <Button variant="ghost" size="sm" onClick={clearAvatar}>
                <Trash2 className="size-4" /> Remove
              </Button>
            ) : null}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            className="sr-only"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadAvatar(file);
              event.target.value = "";
            }}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          PNG, JPEG, WebP or GIF up to 5 MB. Leave it empty and Cadence generates a unique
          gradient avatar for you.
        </p>
      </section>

      {/* Profile fields */}
      <section className="mt-6 space-y-5 rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Profile</h2>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              value={displayName}
              maxLength={48}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <Input
                id="username"
                value={username}
                maxLength={24}
                onChange={(event) =>
                  setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))
                }
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Copy profile link"
                onClick={() => void navigator.clipboard?.writeText(`${window.location.origin}/u/${username}`)}
              >
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Lowercase letters, numbers, dots and underscores. 3–24 characters.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="about">About me</Label>
          <Textarea
            id="about"
            value={about}
            maxLength={300}
            rows={3}
            onChange={(event) => setAbout(event.target.value)}
            placeholder="Tell people what you're building."
          />
          <p className="text-xs text-muted-foreground">{about.length}/300</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status-text">Custom status</Label>
          <Input
            id="status-text"
            value={statusText}
            maxLength={128}
            onChange={(event) => setStatusText(event.target.value)}
            placeholder="What's happening?"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </Button>
          {saved ? (
            <span className="flex items-center gap-1 text-sm text-teal">
              <Check className="size-4" /> Your profile is up to date.
            </span>
          ) : null}
        </div>
      </section>

      {/* Presence */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Status</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusChange(option.value)}
              aria-pressed={status === option.value}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${
                status === option.value
                  ? "border-foreground bg-foreground text-background"
                  : "hover:bg-accent"
              }`}
            >
              <span className={`size-2.5 rounded-full ${option.dot}`} />
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {/* Account */}
      <section className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="text-sm font-semibold">Account</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Email</dt>
            <dd className="truncate font-medium">{user?.email ?? "—"}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="font-medium">
              {profile ? new Date(profile.created_at).toLocaleDateString() : "—"}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
