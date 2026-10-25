"use client";

import { LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** A language icon in the header that opens the list of languages; the current one is ticked. */
export function LanguageSwitch() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

  const choose = (l: string) => {
    if (l === locale) return;
    // @ts-expect-error -- params always match the current pathname
    router.replace({ pathname, params }, { locale: l });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${t("languageGroup")}: ${t(locale)}`}
        className="flex size-11 items-center justify-center rounded-lg text-sign-mist hover:bg-sign-deep hover:text-white data-popup-open:bg-sign-deep data-popup-open:text-white"
      >
        <LanguagesIcon className="size-5.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[1100] w-44 rounded-xl p-1.5 shadow-[0_16px_40px_rgb(14_26_43/0.28)]">
        <DropdownMenuRadioGroup value={locale} onValueChange={choose}>
          {routing.locales.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l} className="min-h-11 pl-3 text-[15px] font-medium">
              {t(l)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
