import Image from "next/image";

/** A user's profile picture, or the first letter of their name on timetable yellow without one. */
export function Avatar({ url, name, size = 32, className = "" }: { url: string | null; name: string; size?: number; className?: string }) {
  const box = `inline-flex shrink-0 overflow-hidden rounded-full ${className}`;
  if (url) {
    return (
      // Already a small 256×256 WebP (src/lib/avatar.ts), so Next's image optimizer is skipped.
      <Image src={url} alt="" width={size} height={size} unoptimized className={`${box} object-cover`} style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`${box} items-center justify-center bg-yellow font-display font-bold text-ink`}
      style={{ width: size, height: size, fontSize: size * 0.56 }}
    >
      {(name.replace(/^@/, "").charAt(0) || "?").toUpperCase()}
    </span>
  );
}
