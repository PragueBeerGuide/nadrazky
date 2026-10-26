import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailTrack } from "@/components/RailTrack";
import { StationSign } from "@/components/StationSign";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <section className="bg-sign py-14 text-center text-white md:py-20">
        <div className="page-column flex flex-col items-center gap-6 *:max-w-xl">
          <StationSign name="404" size="lg" />
          <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
          <p className="text-lg text-sign-mist">{t("body")}</p>
          <Link href="/" className={buttonVariants({ variant: "yellow", size: "xl" })}>
            {t("back")}
          </Link>
        </div>
      </section>
      <RailTrack />
    </>
  );
}
