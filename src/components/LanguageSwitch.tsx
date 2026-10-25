"use client";

import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { Toggle } from "@/components/ui/toggle";

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
          <Toggle
            key={l}
            lang={l}
            aria-label={t(l)}
            pressed={current}
            onPressedChange={() =>
              current ||
              // @ts-expect-error -- params always match the current pathname
              router.replace({ pathname, params }, { locale: l })
            }
            className="h-auto rounded-none px-2.5 py-2.5 md:px-3 text-[13px] font-semibold text-sign-mist uppercase hover:bg-sign-deep hover:text-white aria-pressed:bg-white aria-pressed:text-sign"
          >
            {l}
          </Toggle>
        );
      })}
    </div>
  );
}
