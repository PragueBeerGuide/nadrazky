import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { RailTrack } from "@/components/RailTrack";
import { StationSign } from "@/components/StationSign";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <>
      <section className="bg-sign px-4 py-14 text-center text-white md:py-20">
        <div className="mx-auto flex max-w-xl flex-col items-center gap-6">
          <StationSign name="404" size="lg" />
          <h1 className="text-5xl md:text-6xl">{t("title")}</h1>
          <p className="text-lg text-sign-mist">{t("body")}</p>
          <Link href="/" className="btn btn-yellow">
            {t("back")}
          </Link>
        </div>
      </section>
      <RailTrack />
    </>
  );
}
