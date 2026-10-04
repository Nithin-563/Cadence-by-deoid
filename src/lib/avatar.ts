/**
 * Deterministic generated avatars.
 *
 * No external image service is used — a seed (user id, or channel name for
 * servers) is hashed into a palette pair and rendered as an inline SVG data
 * URI. Same seed always produces the same avatar, on every device, forever.
 */

const PALETTE: ReadonlyArray<readonly [string, string]> = [
  ["#c2410c", "#f59e0b"],
  ["#b91c1c", "#fb7185"],
  ["#a21caf", "#f472b6"],
  ["#6d28d9", "#a78bfa"],
  ["#1d4ed8", "#38bdf8"],
  ["#0f766e", "#2dd4bf"],
  ["#15803d", "#4ade80"],
  ["#a16207", "#facc15"],
];

/** FNV-1a — small, fast, and well spread for short strings. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function avatarColors(seed: string): { from: string; to: string } {
  const [from, to] = PALETTE[hashString(seed) % PALETTE.length];
  return { from, to };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Up to two initials, e.g. "Ada Lovelace" -> "AL", "kestrel" -> "KE". */
export function initialsFor(name: string): string {
  const words = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

export function generatedAvatar(seed: string, name: string): string {
  const { from, to } = avatarColors(seed);
  const initials = escapeXml(initialsFor(name));
  const angle = hashString(`${seed}:angle`) % 360;

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">`,
    `<defs><linearGradient id="g" gradientTransform="rotate(${angle} .5 .5)">`,
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>`,
    `</linearGradient></defs>`,
    `<rect width="96" height="96" rx="28" fill="url(#g)"/>`,
    `<text x="48" y="49" fill="#fff" fill-opacity="0.95"`,
    ` font-family="Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"`,
    ` font-size="38" font-weight="600" text-anchor="middle" dominant-baseline="central">`,
    initials,
    `</text></svg>`,
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
