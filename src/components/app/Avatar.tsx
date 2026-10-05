import * as React from "react";
import { cn } from "@/lib/utils";
import { generatedAvatar } from "@/lib/avatar";
import type { PresenceStatus } from "@/lib/database.types";

const PRESENCE_DOT: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  idle: "bg-amber-400",
  dnd: "bg-red-500",
  offline: "bg-muted-foreground/50",
};

interface AvatarProps {
  /** Stable seed — user id for people, channel/server id for servers. */
  seed: string;
  name: string;
  src?: string | null;
  size?: number;
  className?: string;
  status?: PresenceStatus;
  showStatus?: boolean;
  /** Square tiles look right for servers; circles for people. */
  rounded?: boolean;
}

/**
 * Avatar with a deterministic generated fallback, so every user and server
 * has an identity even before anyone uploads an image.
 */
export function Avatar({
  seed,
  name,
  src,
  size = 40,
  className,
  status,
  showStatus = false,
  rounded = true,
}: AvatarProps) {
  const [failed, setFailed] = React.useState(false);
  const fallback = React.useMemo(() => generatedAvatar(seed, name), [seed, name]);
  const source = src && !failed ? src : fallback;

  return (
    <span
      className={cn("relative inline-flex shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <img
        src={source}
        alt={name}
        width={size}
        height={size}
        onError={() => setFailed(true)}
        className={cn(
          "size-full bg-muted object-cover",
          rounded ? "rounded-full" : "rounded-[28%]",
        )}
        style={{ width: size, height: size }}
        draggable={false}
      />
      {showStatus && status ? (
        <span
          aria-hidden="true"
          title={status}
          className={cn(
            "absolute -right-0.5 -bottom-0.5 rounded-full ring-2 ring-background",
            PRESENCE_DOT[status],
          )}
          style={{ width: Math.max(10, size * 0.3), height: Math.max(10, size * 0.3) }}
        />
      ) : null}
    </span>
  );
}
