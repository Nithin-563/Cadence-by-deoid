import * as React from "react";

import { supabase } from "@/lib/supabase";
import { rows, type ChannelOverwrite } from "@/lib/database.types";
import { PERMISSION_LABELS, PERMISSIONS, type PermissionName } from "@/lib/permissions";

/** The permissions that make sense to override per channel. */
const OVERRIDABLE: PermissionName[] = [
  "VIEW_CHANNEL",
  "SEND_MESSAGES",
  "MANAGE_MESSAGES",
  "ATTACH_FILES",
  "EMBED_LINKS",
  "ADD_REACTIONS",
  "MENTION_EVERYONE",
];

/** `undefined` = inherit, `true` = allow, `false` = deny. */
type TriState = boolean | undefined;

interface OverwriteRow {
  id: string;
  role_id: string | null;
  user_id: string | null;
  label: string;
  colour: string;
}

export function useChannelOverwrites(serverId: string | null) {
  const [overwrites, setOverwrites] = React.useState<ChannelOverwrite[]>([]);

  const reload = React.useCallback(async () => {
    if (!serverId) {
      setOverwrites([]);
      return;
    }
    // Pull overwrites for every channel in the server in one round trip.
    const { data: channelData } = await supabase
      .from("channels")
      .select("id")
      .eq("server_id", serverId);
    const ids = rows<{ id: string }>(channelData).map((c) => c.id);
    if (ids.length === 0) {
      setOverwrites([]);
      return;
    }

    const { data, error } = await supabase.from("channel_overwrites").select("*").in("channel_id", ids);
    if (error) console.error("channel_overwrites failed", error);
    setOverwrites(rows<ChannelOverwrite>(data));
  }, [serverId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  return { overwrites, reload };
}

/**
 * Per-channel allow/deny matrix, mirroring Discord's two-step model:
 * `deny` is applied first, then `allow`.
 */
export function ChannelOverwriteEditor({
  channelId,
  targets,
  overwrites,
  onChanged,
}: {
  channelId: string;
  targets: OverwriteRow[];
  overwrites: ChannelOverwrite[];
  onChanged: () => void;
}) {
  const mine = React.useMemo(
    () => overwrites.filter((o) => o.channel_id === channelId),
    [overwrites, channelId],
  );

  const stateFor = (target: OverwriteRow, permission: PermissionName): TriState => {
    const found = mine.find((o) =>
      target.role_id ? o.role_id === target.role_id : o.user_id === target.user_id,
    );
    if (!found) return undefined;
    const bit = PERMISSIONS[permission];
    if ((found.allow & bit) !== 0) return true;
    if ((found.deny & bit) !== 0) return false;
    return undefined;
  };

  const setState = async (
    target: OverwriteRow,
    permission: PermissionName,
    next: TriState,
  ) => {
    const bit = PERMISSIONS[permission];
    let row = mine.find((o) =>
      target.role_id ? o.role_id === target.role_id : o.user_id === target.user_id,
    );

    const allow = ((row?.allow ?? 0) & ~bit) | (next === true ? bit : 0);
    const deny = ((row?.deny ?? 0) & ~bit) | (next === false ? bit : 0);

    if (!row) {
      if (next === undefined) return;
      const { error } = await supabase.from("channel_overwrites").insert({
        channel_id: channelId,
        role_id: target.role_id,
        user_id: target.user_id,
        allow,
        deny,
      });
      if (error) console.error("insert overwrite failed", error);
    } else if (allow === 0 && deny === 0) {
      await supabase.from("channel_overwrites").delete().eq("id", row.id);
    } else {
      const { error } = await supabase
        .from("channel_overwrites")
        .update({ allow, deny })
        .eq("id", row.id);
      if (error) console.error("update overwrite failed", error);
    }

    onChanged();
  };

  return (
    <div className="mt-3 overflow-x-auto rounded-lg border bg-muted/20">
      <table className="w-full min-w-[32rem] border-collapse text-left text-xs">
        <thead>
          <tr className="border-b">
            <th scope="col" className="px-3 py-2 font-medium">
              Role / member
            </th>
            {OVERRIDABLE.map((permission) => (
              <th key={permission} scope="col" className="px-2 py-2 text-center font-medium">
                {PERMISSION_LABELS[permission].label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targets.map((target) => (
            <tr key={`${target.role_id ?? target.user_id}`} className="border-b last:border-b-0">
              <th scope="row" className="px-3 py-2 font-normal">
                <span className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: target.colour }}
                    aria-hidden="true"
                  />
                  {target.label}
                </span>
              </th>
              {OVERRIDABLE.map((permission) => {
                const state = stateFor(target, permission);
                return (
                  <td key={permission} className="px-2 py-1.5 text-center">
                    <TriStateButton
                      state={state}
                      label={`${PERMISSION_LABELS[permission].label} for ${target.label}`}
                      onCycle={() => {
                        // undefined -> allow -> deny -> inherit
                        const next: TriState =
                          state === undefined ? true : state === true ? false : undefined;
                        void setState(target, permission, next);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        Click to cycle: inherit → allow → deny. Deny is applied before allow.
      </p>
    </div>
  );
}

function TriStateButton({
  state,
  label,
  onCycle,
}: {
  state: TriState;
  label: string;
  onCycle: () => void;
}) {
  const appearance =
    state === true
      ? "bg-emerald-500 text-white"
      : state === false
        ? "bg-red-500 text-white"
        : "bg-foreground/10 text-muted-foreground";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={label}
      title={label}
      className={`inline-flex size-6 items-center justify-center rounded text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 ${appearance}`}
    >
      {state === true ? "✓" : state === false ? "✕" : "/"}
    </button>
  );
}
