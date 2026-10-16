import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("notFound");
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-16 text-center">
      <Image src="/brand/pbg-mascot.png" alt="" width={180} height={180} />
      <h1 className="mt-4 text-4xl text-primary">{t("title")}</h1>
      <p className="mt-3">{t("body")}</p>
      <Link href="/" className="btn btn-primary mt-6">
        {t("back")}
      </Link>
    </div>
  );
}
