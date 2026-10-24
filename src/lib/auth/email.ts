import "server-only";

type VerificationRequest = { identifier: string; url: string; expires: Date };

/**
 * Sends the sign-in link with Resend (https://resend.com), in Czech and English since
 * the visitor's language isn't known here. Without AUTH_RESEND_KEY (local development)
 * the link is printed to the server log instead.
 */
export async function sendSignInLink({ identifier: to, url }: VerificationRequest) {
  const key = process.env.AUTH_RESEND_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!key || !from) {
    console.info(`[auth] Sign-in link for ${to}: ${url}`);
    return;
  }
  const text = [
    "Přihlášení do Nádražek / Sign in to Nádražky",
    "",
    "Pro přihlášení otevři tento odkaz (platí 24 hodin):",
    "To sign in, open this link (valid for 24 hours):",
    "",
    url,
    "",
    "Pokud jsi o přihlášení nežádal(a), e-mail ignoruj. / If you didn't ask to sign in, ignore this email.",
  ].join("\n");
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.5;color:#0e1a2b">
<p style="font-size:22px;font-weight:bold;margin:0 0 16px">Nádražky</p>
<p>Pro přihlášení klikni na tlačítko. Odkaz platí 24 hodin.<br>To sign in, click the button. The link is valid for 24 hours.</p>
<p><a href="${url}" style="display:inline-block;background:#f4c21b;color:#0e1a2b;font-weight:bold;padding:12px 22px;border-radius:10px;text-decoration:none">Přihlásit se / Sign in</a></p>
<p style="color:#566070;font-size:14px">Pokud jsi o přihlášení nežádal(a), e-mail ignoruj.<br>If you didn't ask to sign in, ignore this email.</p>
</div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject: "Přihlášení do Nádražek / Sign in to Nádražky", text, html }),
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
