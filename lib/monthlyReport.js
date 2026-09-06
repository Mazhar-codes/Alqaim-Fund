import ExcelJS from "exceljs";
import { prisma } from "./prisma";

/** [start, end) of the calendar month before the given date, in UTC — same date discipline as lib/dueDate.js. */
export function previousMonthRange(now = new Date()) {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth(); // 0-11, current month
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start, end };
}

function guessImageExtension(url) {
  const match = /\.(png|jpe?g|gif|webp|bmp)(\?|$)/i.exec(url || "");
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpg") return "jpeg";
  return ext || null; // null (e.g. a PDF proof) means "don't try to embed as an image"
}

/**
 * Builds an .xlsx workbook of every payment APPROVED with a paymentDate in
 * [start, end) — the "last month's transaction history" the admin asked
 * for — with each payment's screenshot embedded directly in the row next to
 * its data, not just linked. Screenshots are fetched over HTTP at
 * generation time (Cloudinary URLs), so this is slower than the plain data
 * exports in /api/admin/reports — expected and fine for a once-a-month job.
 */
export async function buildMonthlyPaymentsWorkbook(start, end) {
  const payments = await prisma.payment.findMany({
    where: { status: "APPROVED", paymentDate: { gte: start, lt: end } },
    include: { user: { select: { memberId: true, name: true } } },
    orderBy: { paymentDate: "asc" },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Payments");
  sheet.columns = [
    { header: "Member ID", key: "memberId", width: 14 },
    { header: "Name", key: "name", width: 24 },
    { header: "Amount", key: "amount", width: 14 },
    { header: "Payment Date", key: "paymentDate", width: 16 },
    { header: "Transaction ID", key: "transactionId", width: 20 },
    { header: "Screenshot", key: "screenshot", width: 24 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const p of payments) {
    const row = sheet.addRow({
      memberId: p.user.memberId,
      name: p.user.name,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString().slice(0, 10),
      transactionId: p.transactionId || "—",
      screenshot: p.proofUrl ? "" : "—", // filled with an embedded image below when possible
    });
    row.height = 90;

    if (!p.proofUrl) continue;
    const ext = guessImageExtension(p.proofUrl);
    if (!ext) {
      // Not an image we can embed (e.g. a PDF proof) — leave a clickable link instead.
      row.getCell("screenshot").value = { text: "View (PDF)", hyperlink: p.proofUrl };
      continue;
    }
    try {
      const res = await fetch(p.proofUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const imageId = workbook.addImage({ buffer, extension: ext });
      sheet.addImage(imageId, {
        tl: { col: 5, row: row.number - 1 },
        ext: { width: 120, height: 110 },
        editAs: "oneCell",
      });
    } catch (err) {
      console.error(`Failed to embed screenshot for payment ${p.id}:`, err.message);
      row.getCell("screenshot").value = { text: "View (embed failed)", hyperlink: p.proofUrl };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, count: payments.length };
}
