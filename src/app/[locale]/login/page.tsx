import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHero } from "@/components/PageHero";
import { Link, getPathname } from "@/i18n/navigation";
import { asLocale } from "@/i18n/routing";
import { authEnabled, authProviders, safeReturnPath } from "@/lib/auth/config";
import { getCurrentUser, signUpFinished } from "@/lib/auth/currentUser";
import { ROLES } from "@/lib/auth/roles";
import { suggestUsername } from "@/lib/auth/signup";
import { devSignIn, logOut, signInWithGoogle } from "./actions";
import { FinishSignUpForm } from "./FinishSignUpForm";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("auth");
  return { title: t("title"), robots: { index: false } };
}

const errorKeys = ["AccessDenied", "CredentialsSignin"] as const;

/** Log in and sign up in one place: the first sign-in creates the account, then the user finishes sign-up here. */
export default async function LoginPage({ params, searchParams }: PageProps<"/[locale]/login">) {
  const { locale: raw } = await params;
  const locale = asLocale(raw);
  setRequestLocale(locale);
  const query = await searchParams;
  const next = safeReturnPath(query.next, "");
  const t = await getTranslations("auth");
  const user = await getCurrentUser();

  if (user && signUpFinished(user)) redirect(next || getPathname({ locale, href: "/" }));

  const providers = authProviders();
  const error = typeof query.error === "string" ? query.error : null;
  const errorKey = error ? (errorKeys.find((k) => k === error) ?? "default") : null;
  const privacy = t.rich("privacyLink", {
    link: (chunks) => (
      <Link href="/privacy" className="link">
        {chunks}
      </Link>
    ),
  });
  const hidden = (
    <>
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="next" value={next} />
    </>
  );

  return (
    <>
      <PageHero title={user ? t("finishTitle") : t("title")} subtitle={user ? t("finishText") : t("subtitle")} />
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-8 md:py-12">
        {user ? (
          <Card render={<section />} className="flex flex-col gap-5 p-5 md:p-7">
            <p className="text-[15px] text-muted-foreground">{t("signedInAs", { email: user.email ?? user.name ?? "" })}</p>
            <FinishSignUpForm
              locale={locale}
              next={next}
              username={user.username ?? suggestUsername(user.name ?? user.email)}
              // Not chosen yet (the column defaults to cs): start from the page's language.
              language={locale}
            />
            <p className="text-sm text-muted-foreground">{privacy}</p>
            <form action={logOut}>
              {hidden}
              <Button type="submit" variant="link" className="h-auto p-0 text-[15px]">
                {t("notYou")}
              </Button>
            </form>
          </Card>
        ) : !authEnabled() || !providers.google ? (
          <Card render={<p />} className="p-5 md:p-7">{t("notConfigured")}</Card>
        ) : (
          <Card render={<section />} className="flex flex-col gap-5 p-5 md:p-7">
            {errorKey && (
              <Alert variant="error">{t(`errors.${errorKey}`)}</Alert>
            )}
            <form action={signInWithGoogle}>
              {hidden}
              <Button variant="outline" size="xl" type="submit" className="h-14 w-full rounded-xl text-[17px]">
                <GoogleMark />
                {t("google")}
              </Button>
            </form>
            <div className="flex flex-col gap-1 border-t border-rule-soft pt-4 text-sm text-muted-foreground">
              <p>{t("adultsOnly")}</p>
              <p>{privacy}</p>
            </div>
          </Card>
        )}

        {!user && providers.dev && (
          <section className="flex flex-col gap-3 rounded-[14px] border border-dashed border-field bg-white p-5">
            <h2 className="text-2xl">{t("devTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("devText")}</p>
            <form action={devSignIn} className="flex flex-wrap gap-2">
              {hidden}
              <label htmlFor="dev-email" className="sr-only">
                {`${t("devTitle")}: ${t("email")}`}
              </label>
              <Input id="dev-email" name="email" type="email" required placeholder={t("emailPlaceholder")} className="min-w-0 flex-[1_1_200px]" />
              <label htmlFor="dev-role" className="sr-only">
                {`${t("devTitle")}: ${t("devRole")}`}
              </label>
              <NativeSelect id="dev-role" name="role" defaultValue="user" className="w-auto flex-[0_0_auto]">
                {ROLES.map((r) => (
                  <NativeSelectOption key={r} value={r}>
                    {t(`roles.${r}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <Button variant="ink" size="xl" type="submit" className="h-11.5">
                {t("devSubmit")}
              </Button>
            </form>
          </section>
        )}
      </div>
    </>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.4h6.5a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.5-5.1 3.5-8.7z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 7.9-2.9l-3.9-3c-1 .7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9h-4v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6V6.6h-4a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1C6.3 6.9 8.9 4.8 12 4.8z" />
    </svg>
  );
}
