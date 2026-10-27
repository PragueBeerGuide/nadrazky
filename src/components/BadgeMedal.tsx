import { CheckIcon } from "lucide-react";
import type { BadgeKind } from "@/lib/badges";
import { cn } from "@/lib/utils";
import { MedalPie } from "./MedalPie";

/** The ring of a badge, by kind; a completed one turns gold. */
const RING: Record<BadgeKind, string> = { line: "bg-sign", region: "bg-ink", pubs: "bg-yellow" };
/** The inner edge and title colour of a badge. */
const INNER: Record<BadgeKind, string> = { line: "border-yellow text-sign", region: "border-sign text-ink", pubs: "border-ink text-ink" };

// Everything inside scales with the medal's font size.
const SIZE = { sm: "size-[92px] text-[10px]", md: "size-[132px] text-[14px]", lg: "size-[168px] text-[17px]" };

const TITLE: Record<BadgeKind, string> = {
  line: "text-[2.6em]",
  region: "text-[1.15em] [overflow-wrap:anywhere]",
  pubs: "text-[1.55em]",
};

type FaceProps = { kind: BadgeKind; label: string; title: string; complete: boolean };

/** The medal itself, without its level tab: ring, inner edge, kind and title; `grey` before it colours in. */
function Face({ kind, label, title, complete, grey = false, className, style }: FaceProps & { grey?: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={cn("absolute inset-0 flex items-center justify-center rounded-full", grey ? "bg-medal-grey" : complete ? "bg-gold" : RING[kind], className)}
      style={style}
    >
      <div
        className={cn(
          "flex size-[80%] flex-col items-center justify-center gap-[0.15em] rounded-full border-[0.22em] bg-white px-[0.6em] text-center",
          grey ? "border-medal-grey-edge text-muted-foreground" : INNER[kind],
          complete && !grey && "border-yellow",
        )}
      >
        <span className="font-mono text-[0.72em] font-semibold tracking-[0.12em] text-muted-foreground uppercase">{label}</span>
        <span className={cn("font-display leading-[0.95] font-bold", TITLE[kind])}>{title}</span>
      </div>
    </div>
  );
}

/**
 * A round badge in the style of a station sign: the kind on top, its line number or name,
 * and a tab with the level. Until it is complete it starts light grey, and colours in
 * like a pie, clockwise from the top, as the user gets closer to the next level. After
 * progress, the new part rises in (MedalPie).
 */
export function BadgeMedal({
  kind,
  label,
  title,
  level,
  complete,
  fill = 0,
  fillFrom,
  rememberAs,
  levelLabel,
  size = "md",
  className,
}: FaceProps & {
  /** 0 when not started. */
  level: number;
  /** The part in colour, 0–1: how far the user is on the way to the next level. */
  fill?: number;
  /** Where the colour rises from when shown, instead of what this browser last showed. */
  fillFrom?: number;
  /** The badge's key: the colour rises from what this browser last showed of it, when there was progress. */
  rememberAs?: string;
  /** Read out instead of the medal: the badge and its level. */
  levelLabel: string;
  size?: keyof typeof SIZE;
  className?: string;
}) {
  const face = { kind, label, title, complete };
  const turn = Math.min(Math.max(fill, 0), 1);
  return (
    <div role="img" aria-label={levelLabel} className={cn("relative shrink-0 rounded-full shadow-medal", SIZE[size], className)}>
      {complete ? (
        <Face {...face} />
      ) : (
        <>
          <Face {...face} grey />
          {/* Even with nothing in colour yet, so that it remembers where the colour starts from */}
          <MedalPie fill={turn} level={level} rememberAs={rememberAs} from={fillFrom}>
            <Face {...face} />
          </MedalPie>
        </>
      )}
      {level > 0 && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute -bottom-[0.3em] left-1/2 flex h-[1.9em] min-w-[1.9em] -translate-x-1/2 items-center justify-center rounded-full border-[0.18em] border-white px-[0.5em] font-mono text-[1.05em] leading-none font-semibold",
            complete ? "bg-yellow text-ink" : "bg-ink text-yellow",
          )}
        >
          {complete ? <CheckIcon strokeWidth={3} className="size-[1.1em]" /> : level}
        </span>
      )}
    </div>
  );
}
