import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { buildMonthlyPaymentsWorkbook, previousMonthRange } from "@/lib/monthlyReport";

/**
 * GET /api/cron/monthly-report[?month=YYYY-MM]
 * Generates last month's approved-payments report (with embedded
 * screenshots) and emails it to Settings.reportRecipientEmail.
 *
 * Two ways to reach this route:
 *  - Vercel Cron (see vercel.json): Vercel automatically sends
 *    `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is set as an
 *    env var — this is Vercel's documented way to secure a cron endpoint.
 *  - A logged-in admin (the "Send Test Report Now" button in
 *    /admin/settings) — same Firebase Bearer-token auth as every other
 *    admin API route, so this can be tested without waiting for the 1st
 *    of the month.
 * The optional ?month=YYYY-MM override is for that manual/test path, to
 * generate a report for a month that actually has data in it.
 */
export async function GET(request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization") || "";
  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    try {
      await requireAdmin(request);
    } catch (err) {
      if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const monthParam = request.nextUrl.searchParams.get("month"); // "YYYY-MM"
    let start, end;
    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      start = new Date(Date.UTC(y, m - 1, 1));
      end = new Date(Date.UTC(y, m, 1));
    } else {
      ({ start, end } = previousMonthRange());
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    if (!settings?.reportRecipientEmail) {
      return NextResponse.json(
        { error: "No reportRecipientEmail set — configure it in Admin → Settings first.", sent: false },
        { status: 200 }
      );
    }

    const { buffer, count } = await buildMonthlyPaymentsWorkbook(start, end);
    const label = start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

    const result = await sendEmail({
      to: settings.reportRecipientEmail,
      subject: `AGS Fund — ${label} Payments Report (${count} payment${count === 1 ? "" : "s"})`,
      html: `<p>Attached: every approved payment for <strong>${label}</strong> (${count} total), with screenshots embedded.</p>`,
      attachments: [{ filename: `payments-${label.replace(" ", "-")}.xlsx`, content: buffer }],
    });

    return NextResponse.json({ ...result, month: label, count });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to build/send monthly report" }, { status: 500 });
  }
}
