import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  return (
    <footer className="bg-primary-deep text-primary-mist">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-pbg-sm md:flex-row md:items-center md:justify-between">
        <p>{t("data")}</p>
        <p className="flex gap-4">
          <Link href="/about" className="underline-offset-2 hover:underline">
            {nav("about")}
          </Link>
          <a href="https://pragueguide.beer" className="underline-offset-2 hover:underline">
            {t("by")}
          </a>
        </p>
      </div>
    </footer>
  );
}
