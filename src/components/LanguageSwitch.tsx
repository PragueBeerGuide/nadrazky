"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** CS | EN switch; the current language is the white segment. */
export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  return (
    <div
      role="group"
      aria-label={t("languageGroup")}
      className="flex overflow-hidden rounded-lg border border-[#3a5590] font-mono text-[13px] font-semibold"
    >
      {routing.locales.map((l) => {
        const current = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            aria-label={t(l)}
            aria-pressed={current}
            onClick={() =>
              current ||
              // @ts-expect-error -- params always match the current pathname
              router.replace({ pathname, params }, { locale: l })
            }
            className={`px-3 py-2.5 uppercase ${current ? "bg-white text-sign" : "text-sign-mist hover:bg-sign-deep hover:text-white"}`}
          >
            {l}
          </button>
        );
      })}
    </div>
  );
}
