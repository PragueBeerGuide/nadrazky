import { Avatar as AvatarRoot, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** A user's profile picture, or the first letter of their name on timetable yellow without one. */
export function Avatar({ url, name, size = 32, className }: { url: string | null; name: string; size?: number; className?: string }) {
  return (
    <AvatarRoot aria-hidden="true" className={cn("size-auto", className)} style={{ width: size, height: size }}>
      {/* Already a small 256×256 WebP (src/lib/avatar.ts), so it needs no resizing. */}
      {url && <AvatarImage src={url} alt="" />}
      <AvatarFallback className="bg-yellow font-display font-bold text-ink" style={{ fontSize: size * 0.56 }}>
        {(name.replace(/^@/, "").charAt(0) || "?").toUpperCase()}
      </AvatarFallback>
    </AvatarRoot>
  );
}
