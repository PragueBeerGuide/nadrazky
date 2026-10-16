"use client";

import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import { usePathname, useRouter } from "@/i18n/navigation";

export function LanguageSwitch({ label, ariaLabel }: { label: string; ariaLabel: string }) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const next = locale === "cs" ? "en" : "cs";

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onClick={() =>
        // @ts-expect-error -- params always match the current pathname
        router.replace({ pathname, params }, { locale: next })
      }
      className="rounded-sm border border-primary-mist px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:bg-primary-deep"
    >
      {label}
    </button>
  );
}
