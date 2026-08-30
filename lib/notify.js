import { prisma } from "./prisma";

/**
 * Sends the newly-generated MemberID to the user after registration.
 * Stubbed until a provider is chosen — gated behind Settings.smsEnabled so it
 * is a no-op (just logs) until configured. See MEMORY.md "Decisions still open".
 */
export async function notifyMemberId({ name, phone, email, memberId }) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.smsEnabled || !process.env.SMS_PROVIDER || !process.env.SMS_API_KEY) {
    console.log(`[notify] (SMS disabled) ${name} <${phone}/${email}> MemberID: ${memberId}`);
    return { sent: false };
  }

  // TODO: wire up the chosen provider (Twilio / local PK SMS API) here.
  console.log(`[notify] Would send MemberID ${memberId} to ${phone} via ${process.env.SMS_PROVIDER}`);
  return { sent: false };
}
