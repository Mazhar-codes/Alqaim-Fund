/**
 * Real email sending via Resend's HTTP API (https://resend.com) — no SDK
 * dependency, just fetch. Gated behind RESEND_API_KEY exactly like
 * lib/notify.js is gated behind SMS_PROVIDER/SMS_API_KEY: a no-op with a
 * clear console log until the env vars are actually set, so nothing crashes
 * before the admin has signed up for a provider and added the key.
 *
 * Setup needed before this can actually send anything:
 *   1. Create a free account at https://resend.com
 *   2. Either verify a sending domain, or use their sandbox sender
 *      (`onboarding@resend.dev`) for testing — set RESEND_FROM_EMAIL to
 *      whichever address you're allowed to send from.
 *   3. Create an API key in the Resend dashboard, set RESEND_API_KEY.
 *   4. Add both env vars in Vercel (Project -> Settings -> Environment
 *      Variables) so it works in production, not just locally.
 */
export async function sendEmail({ to, subject, html, attachments }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log(`[email] (RESEND_API_KEY/RESEND_FROM_EMAIL not set) Would send "${subject}" to ${to}`);
    return { sent: false, reason: "not_configured" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      ...(attachments && {
        attachments: attachments.map((a) => ({
          filename: a.filename,
          content: a.content.toString("base64"),
        })),
      }),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Resend API error (${res.status}): ${body}`);
  }

  return { sent: true };
}
