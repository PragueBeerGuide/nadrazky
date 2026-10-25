import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const sizes = {
  sm: "",
  lg: "rounded-md px-3 py-1 text-[1.375rem] leading-7",
  xl: "rounded-xl px-6 py-3 text-[clamp(2.75rem,7vw,4.5rem)] leading-none",
} as const;

/** A rail line number on timetable yellow. */
export function LineChip({
  number,
  size = "sm",
  className,
}: {
  number: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <Badge variant="line" className={cn(sizes[size], className)}>
      {number}
    </Badge>
  );
}
