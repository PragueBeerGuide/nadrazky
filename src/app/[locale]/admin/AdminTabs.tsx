import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Switches between the admin dashboard and the lists of lines and of stations, in the page hero. */
export async function AdminTabs({ current }: { current: "dashboard" | "lines" | "stations" }) {
  const [t, dt] = await Promise.all([getTranslations("admin"), getTranslations("adminDashboard")]);
  const tab = (active: boolean) => cn(buttonVariants({ variant: active ? "yellow" : "ghost-dark", size: "xl" }), "h-11");
  return (
    <nav aria-label={dt("title")} className="mt-2 flex flex-wrap gap-2">
      <Link href="/admin" aria-current={current === "dashboard" ? "page" : undefined} className={tab(current === "dashboard")}>
        {dt("tabDashboard")}
      </Link>
      <Link href="/admin/lines" aria-current={current === "lines" ? "page" : undefined} className={tab(current === "lines")}>
        {t("tabLines")}
      </Link>
      <Link href="/admin/stations" aria-current={current === "stations" ? "page" : undefined} className={tab(current === "stations")}>
        {t("tabStations")}
      </Link>
    </nav>
  );
}
