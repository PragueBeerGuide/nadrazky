const sizes = {
  sm: { plate: "rounded-[6px] p-[3px]", inner: "rounded-[4px] border-2 px-3 text-[1.625rem] leading-9" },
  md: { plate: "rounded-[7px] p-1", inner: "rounded-[4px] border-[3px] px-5 py-0.5 text-5xl leading-none" },
  lg: {
    plate: "rounded-lg p-[5px]",
    inner: "rounded-[5px] border-[3px] px-5 py-1 text-5xl leading-none md:px-7 md:text-7xl",
  },
} as const;

/** White enamel station sign with a blue border, as on Czech platforms. */
export function StationSign({
  name,
  size = "lg",
  as: Tag = "span",
  shadow = true,
  className = "",
}: {
  name: string;
  size?: keyof typeof sizes;
  as?: "span" | "p" | "div";
  shadow?: boolean;
  className?: string;
}) {
  const s = sizes[size];
  return (
    <Tag
      className={`inline-flex max-w-full bg-white ${s.plate} ${shadow ? "shadow-[0_10px_24px_rgb(5_12_28/0.35)]" : ""} ${className}`}
    >
      <span className={`block min-w-0 border-sign font-display font-bold text-sign ${s.inner}`}>{name}</span>
    </Tag>
  );
}
