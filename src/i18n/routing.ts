import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["cs", "en"],
  defaultLocale: "cs",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/map": { cs: "/mapa", en: "/map" },
    "/pubs": { cs: "/hospody", en: "/pubs" },
    "/pub/[slug]": { cs: "/hospoda/[slug]", en: "/pub/[slug]" },
    "/pub/[slug]/check-in": { cs: "/hospoda/[slug]/odbaveni", en: "/pub/[slug]/check-in" },
    "/pub/[slug]/report": { cs: "/hospoda/[slug]/nahlasit-zmenu", en: "/pub/[slug]/report" },
    "/regions": { cs: "/kraje", en: "/regions" },
    "/region/[slug]": { cs: "/kraj/[slug]", en: "/region/[slug]" },
    "/lines": { cs: "/trate", en: "/lines" },
    "/line/[number]": { cs: "/trat/[number]", en: "/line/[number]" },
    "/badges": { cs: "/odznaky", en: "/badges" },
    "/badges/pubs": { cs: "/odznaky/nadrazak", en: "/badges/nadrazak" },
    "/badges/line/[number]": { cs: "/odznaky/trat/[number]", en: "/badges/line/[number]" },
    "/badges/region/[slug]": { cs: "/odznaky/kraj/[slug]", en: "/badges/region/[slug]" },
    "/about": { cs: "/o-aplikaci", en: "/about" },
    "/login": { cs: "/prihlaseni", en: "/login" },
    "/privacy": { cs: "/ochrana-soukromi", en: "/privacy" },
    "/profile": { cs: "/profil", en: "/profile" },
    "/friends": { cs: "/pratele", en: "/friends" },
    "/moderation": { cs: "/moderace", en: "/moderation" },
    "/admin": { cs: "/sprava", en: "/admin" },
    "/admin/lines": { cs: "/sprava/trate", en: "/admin/lines" },
    "/admin/line/[number]": { cs: "/sprava/trat/[number]", en: "/admin/line/[number]" },
    "/admin/stations": { cs: "/sprava/stanice", en: "/admin/stations" },
    "/admin/station/[slug]": { cs: "/sprava/stanice/[slug]", en: "/admin/station/[slug]" },
  },
});

export type Locale = (typeof routing.locales)[number];

/** Route params are typed as string; the proxy guarantees a supported locale. */
export function asLocale(value: string): Locale {
  return (routing.locales as readonly string[]).includes(value) ? (value as Locale) : routing.defaultLocale;
}
