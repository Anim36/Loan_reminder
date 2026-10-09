"use client";

/**
 * Figma reference: avatar swatches across multiple frames
 *   10:6833 (Tanvir, bg #ede8dc), 10:6776 (Rafi, bg #e5eee7),
 *   10:6845 (Nusrat, bg #f0e7e6), 10:6908 (avatar bg #e9ebf0 default)
 *
 * Sizes: 36px (table / mobile card) and 32px (sidebar brand mark) used most
 * often. Label is rendered in 13px semibold, text-brand-600 (DM Sans).
 */

const PALETTE = [
  "bg-[#e9ebf0]",
  "bg-[#e5eee7]",
  "bg-[#ede8dc]",
  "bg-[#f0e7e6]",
  "bg-[#eae5cf]",
  "bg-[#f1d8d0]",
];

/** djb2-ish hash → stable palette index per name. */
function hashName(name: string) {
  let h = 5381;
  for (let i = 0; i < name.length; i++) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  return h % PALETTE.length;
}

export interface AvatarProps {
  name: string;
  size?: 28 | 32 | 36 | 40 | 56;
  className?: string;
}

export function Avatar({ name, size = 36, className = "" }: AvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const tone = PALETTE[hashName(name)];
  return (
    <span
      aria-label={name}
      title={name}
      className={[
        "inline-flex items-center justify-center rounded-pill shrink-0 font-semibold text-label text-brand-600 overflow-hidden",
        tone,
        className,
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}