import * as React from "react";
import { Check, Copy, Loader2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { Avatar } from "@/components/app/Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { MyServer, Profile, PresenceStatus } from "@/lib/database.types";

/* --------------------------------------------------------------- server --- */

export function CreateServerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (serverId: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("create_server", {
      p_name: trimmed,
      p_description: description.trim(),
    });

    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setName("");
    setDescription("");
    onOpenChange(false);
    onCreated(String(data));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a server</DialogTitle>
          <DialogDescription>
            Servers hold channels, roles and members. You get #general and #random to start.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-server-name">Server name</Label>
            <Input
              id="new-server-name"
              value={name}
              maxLength={64}
              autoFocus
              placeholder="Design team"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void submit()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-server-description">Description (optional)</Label>
            <Textarea
              id="new-server-description"
              value={description}
              maxLength={300}
              rows={2}
              placeholder="What happens in this server?"
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function JoinServerDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: (serverId: string) => void;
}) {
  const [code, setCode] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);

    const { data, error: rpcError } = await supabase.rpc("join_server", { p_code: trimmed });

    setBusy(false);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    setCode("");
    onOpenChange(false);
    onJoined(String(data));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a server</DialogTitle>
          <DialogDescription>
            Paste an invite code. Ask a friend in another server to open
            Server settings → Overview and copy theirs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="invite-code">Invite code</Label>
          <Input
            id="invite-code"
            value={code}
            autoFocus
            placeholder="e.g. 9f2ac41d"
            className="font-mono"
            onChange={(event) => setCode(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && void submit()}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !code.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Join
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InviteDialog({
  open,
  onOpenChange,
  server,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  server: MyServer;
}) {
  const [code, setCode] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const { data, error: rpcError } = await supabase.rpc("create_invite", { p_server: server.id });
    setBusy(false);
    if (rpcError) setError(rpcError.message);
    else setCode(String(data));
  };

  const inviteUrl = code ? `${window.location.origin}/invite/${code}` : "";

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) {
          setCode(null);
          setCopied(false);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite people to {server.name}</DialogTitle>
          <DialogDescription>
            Anyone with this link can join. Generate a fresh one if it leaks.
          </DialogDescription>
        </DialogHeader>

        {code ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} className="font-mono text-xs" />
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard?.writeText(inviteUrl);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Or share just the code: <span className="font-mono font-semibold">{code}</span>
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No active invite yet. Generate one to get a shareable link.
          </p>
        )}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={generate} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {code ? "Generate new link" : "Generate invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- channel --- */

export function CreateChannelDialog({
  open,
  onOpenChange,
  serverId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serverId: string;
  onCreated: (channelId: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [topic, setTopic] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async () => {
    const clean = name
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    if (!clean) return;

    setBusy(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("channels")
      .insert({ server_id: serverId, kind: "text", name: clean, topic: topic.trim() })
      .select()
      .single();

    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    setTopic("");
    onOpenChange(false);
    if (data) onCreated((data as { id: string }).id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a channel</DialogTitle>
          <DialogDescription>
            Channels are where conversations happen. Use a short, lowercase name.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="channel-name">Channel name</Label>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-muted-foreground">#</span>
              <Input
                id="channel-name"
                value={name}
                autoFocus
                maxLength={64}
                placeholder="product-feedback"
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && void submit()}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="channel-topic">Topic (optional)</Label>
            <Textarea
              id="channel-topic"
              value={topic}
              rows={2}
              maxLength={256}
              placeholder="What's this channel for?"
              onChange={(event) => setTopic(event.target.value)}
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------- profile --- */

export function ProfileDialog({
  open,
  onOpenChange,
  profile,
  presence,
  currentUserId,
  onSendMessage,
  onAddFriend,
  onBlock,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: Profile | null;
  presence: PresenceStatus;
  currentUserId: string;
  onSendMessage: (userId: string) => void;
  onAddFriend: (userId: string) => void;
  onBlock: (userId: string) => void;
}) {
  if (!profile) return null;
  const isMe = profile.id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="h-24 rounded-t-lg bg-linear-to-br from-ember-500/50 to-gold-400/40" />
        <div className="-mt-10 px-6 pb-2">
          <Avatar
            seed={profile.id}
            name={profile.display_name}
            src={profile.avatar_url}
            size={72}
            className="rounded-full ring-4 ring-background"
          />
        </div>

        <DialogHeader className="px-6">
          <DialogTitle className="flex items-center gap-2">
            {profile.display_name}
            <span className="text-sm font-normal text-muted-foreground">
              @{profile.username}
            </span>
          </DialogTitle>
          <DialogDescription>
            {profile.status_text ? (
              <span className="block">“{profile.status_text}”</span>
            ) : null}
            <span className="block capitalize">Status: {presence}</span>
            {profile.about ? <span className="mt-2 block">{profile.about}</span> : null}
            <span className="mt-2 block text-xs">
              Joined {new Date(profile.created_at).toLocaleDateString()}
            </span>
          </DialogDescription>
        </DialogHeader>

        {!isMe ? (
          <DialogFooter className="px-6">
            <Button variant="outline" onClick={() => onSendMessage(profile.id)}>
              Send message
            </Button>
            <Button onClick={() => onAddFriend(profile.id)}>Add friend</Button>
            <Button variant="ghost" className="text-destructive" onClick={() => onBlock(profile.id)}>
              Block
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
