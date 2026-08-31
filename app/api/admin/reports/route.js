import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/**
 * GET /api/admin/reports?type=collection|defaulters|loans&format=json|xlsx
 */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const type = request.nextUrl.searchParams.get("type") || "collection";
    const format = request.nextUrl.searchParams.get("format") || "json";

    let rows = [];
    let columns = [];

    if (type === "collection") {
      const paid = await prisma.installment.findMany({
        where: { status: "PAID" },
        include: { user: { select: { memberId: true, name: true } } },
        orderBy: { paidDate: "desc" },
      });
      columns = [
        { header: "Member ID", key: "memberId", width: 14 },
        { header: "Name", key: "name", width: 24 },
        { header: "Installment #", key: "installmentNumber", width: 14 },
        { header: "Plan Amount Due", key: "amount", width: 16 },
        { header: "Amount Actually Paid", key: "amountPaid", width: 18 },
        { header: "Shortfall", key: "shortfall", width: 14 },
        { header: "Loan Deduction", key: "loanDeduction", width: 16 },
        { header: "Paid Date", key: "paidDate", width: 14 },
      ];
      rows = paid.map((i) => {
        // Older installments paid before amountPaid was tracked default to
        // the due amount (they could only reach PAID via an exact match
        // back then) — never fall back to it for anything recorded after.
        const amountPaid = i.amountPaid != null ? Number(i.amountPaid) : Number(i.amount);
        return {
          memberId: i.user.memberId,
          name: i.user.name,
          installmentNumber: i.installmentNumber,
          amount: Number(i.amount),
          amountPaid,
          shortfall: Number(i.amount) - amountPaid,
          loanDeduction: Number(i.loanDeduction),
          paidDate: i.paidDate?.toISOString().slice(0, 10),
        };
      });
    } else if (type === "defaulters") {
      const overdue = await prisma.installment.findMany({
        where: { status: "PENDING", dueDate: { lt: new Date() } },
        include: { user: { select: { memberId: true, name: true, phone: true } } },
        orderBy: { dueDate: "asc" },
      });
      columns = [
        { header: "Member ID", key: "memberId", width: 14 },
        { header: "Name", key: "name", width: 24 },
        { header: "Phone", key: "phone", width: 16 },
        { header: "Installment #", key: "installmentNumber", width: 14 },
        { header: "Amount Due", key: "amountDue", width: 14 },
        { header: "Due Date", key: "dueDate", width: 14 },
      ];
      rows = overdue.map((i) => ({
        memberId: i.user.memberId,
        name: i.user.name,
        phone: i.user.phone,
        installmentNumber: i.installmentNumber,
        amountDue: Number(i.amount) + Number(i.loanDeduction),
        dueDate: i.dueDate.toISOString().slice(0, 10),
      }));
    } else if (type === "loans") {
      const loans = await prisma.loanRequest.findMany({
        include: { user: { select: { memberId: true, name: true } } },
        orderBy: { createdAt: "desc" },
      });
      columns = [
        { header: "Member ID", key: "memberId", width: 14 },
        { header: "Name", key: "name", width: 24 },
        { header: "Reason", key: "reasonCategory", width: 20 },
        { header: "Amount", key: "amount", width: 14 },
        { header: "Repaid", key: "totalRepaid", width: 14 },
        { header: "Status", key: "status", width: 12 },
        { header: "Applied", key: "createdAt", width: 14 },
      ];
      rows = loans.map((l) => ({
        memberId: l.user.memberId,
        name: l.user.name,
        reasonCategory: l.reasonCategory,
        amount: Number(l.amount),
        totalRepaid: Number(l.totalRepaid),
        status: l.status,
        createdAt: l.createdAt.toISOString().slice(0, 10),
      }));
    } else {
      return NextResponse.json({ error: "Unknown report type" }, { status: 400 });
    }

    if (format === "xlsx") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet(type);
      sheet.columns = columns;
      sheet.addRows(rows);
      sheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
        },
      });
    }

    return NextResponse.json({ rows });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
