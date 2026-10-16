import { Link } from "@/i18n/navigation";

const sizes = { sm: "", lg: "line-chip-lg", xl: "line-chip-xl" } as const;

/** A rail line number on timetable yellow; links to the line when `link` is set. */
export function LineChip({
  number,
  size = "sm",
  link = false,
  className = "",
}: {
  number: string;
  size?: keyof typeof sizes;
  link?: boolean;
  className?: string;
}) {
  const cls = `line-chip ${sizes[size]} ${className}`;
  return link ? (
    <Link href={{ pathname: "/line/[number]", params: { number } }} className={`${cls} hover:bg-[#e5b40f]`}>
      {number}
    </Link>
  ) : (
    <span className={cls}>{number}</span>
  );
}
