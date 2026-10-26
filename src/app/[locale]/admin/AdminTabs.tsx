import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Switches between the admin lists of lines and of stations, in the page hero. */
export async function AdminTabs({ current }: { current: "lines" | "stations" }) {
  const t = await getTranslations("admin");
  const tab = (active: boolean) => cn(buttonVariants({ variant: active ? "yellow" : "ghost-dark", size: "xl" }), "h-11");
  return (
    <nav aria-label={t("title")} className="mt-2 flex gap-2">
      <Link href="/admin/lines" aria-current={current === "lines" ? "page" : undefined} className={tab(current === "lines")}>
        {t("tabLines")}
      </Link>
      <Link href="/admin/stations" aria-current={current === "stations" ? "page" : undefined} className={tab(current === "stations")}>
        {t("tabStations")}
      </Link>
    </nav>
  );
}
