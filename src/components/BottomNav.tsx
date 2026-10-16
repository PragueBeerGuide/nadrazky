import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const icons = {
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  map: "M9 4 3 6v14l6-2 6 2 6-2V4l-6 2zm0 0v14m6-12v14",
  pubs: "M4 6h16M4 12h16M4 18h10",
  lines: "M4 19 20 5M7 19l-3-3m12-11 3 3M9 14l1 1m3-5 1 1",
} as const;

export async function BottomNav() {
  const t = await getTranslations("nav");
  const items = [
    { href: "/", label: t("home"), icon: icons.home },
    { href: "/map", label: t("map"), icon: icons.map },
    { href: "/pubs", label: t("pubs"), icon: icons.pubs },
    { href: "/lines", label: t("lines"), icon: icons.lines },
  ] as const;
  return (
    <nav
      aria-label="Bottom"
      className="fixed inset-x-0 bottom-0 z-[1000] border-t border-border bg-card md:hidden"
    >
      <ul className="grid grid-cols-4">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="flex flex-col items-center gap-0.5 py-2 text-xs font-medium text-primary">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d={i.icon} />
              </svg>
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
