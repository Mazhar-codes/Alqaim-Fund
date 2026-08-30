import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { appendTransaction } from "@/lib/ledger";
import { buildRepaymentSchedule } from "@/lib/loan";

/** GET /api/admin/loans?status=PENDING (default) | APPROVED | ACTIVE | REJECTED | COMPLETED | ALL */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const status = request.nextUrl.searchParams.get("status") || "PENDING";

    const loans = await prisma.loanRequest.findMany({
      where: status === "ALL" ? {} : { status },
      include: {
        user: { select: { memberId: true, name: true, phone: true, paidInstallments: true, planId: true } },
        repayments: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ loans });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load loan/emergency queue" }, { status: 500 });
  }
}

/**
 * Body: { loanId, action: "approve"|"reject", adminNote?, tenureMonths? }
 *
 * This is the "genuine emergency only" gate in practice: a loan sits as
 * PENDING with the member's stated reason + proof document until an admin
 * reviews it here. Reject just closes it out. Approve immediately releases
 * the funds (per business rule: admin approval IS the fund release trigger)
 * — it appends an IN ledger entry for the member and spreads the no-interest
 * repayment across their upcoming installments via `loanDeduction`.
 */
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { loanId, action, adminNote, tenureMonths } = await request.json();
    if (!loanId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "loanId and a valid action are required" }, { status: 400 });
    }

    const loan = await prisma.loanRequest.findUnique({ where: { id: Number(loanId) } });
    if (!loan) return NextResponse.json({ error: "Loan request not found" }, { status: 404 });
    if (loan.status !== "PENDING") {
      return NextResponse.json({ error: "This request has already been processed" }, { status: 409 });
    }

    if (action === "reject") {
      const updated = await prisma.loanRequest.update({
        where: { id: loan.id },
        data: { status: "REJECTED", adminNote: adminNote || "Rejected by admin" },
      });
      return NextResponse.json({ loan: updated });
    }

    const result = await prisma.$transaction(async (tx) => {
      const futureInstallments = await tx.installment.findMany({
        where: { userId: loan.userId, status: "PENDING" },
        orderBy: { installmentNumber: "asc" },
      });

      const months = Math.max(1, Math.min(Number(tenureMonths) || futureInstallments.length || 1, futureInstallments.length || 1));
      const schedule = buildRepaymentSchedule(Number(loan.amount), months);

      for (let i = 0; i < futureInstallments.length && i < schedule.length; i++) {
        await tx.installment.update({
          where: { id: futureInstallments[i].id },
          data: { loanDeduction: { increment: schedule[i] } },
        });
      }

      const updatedLoan = await tx.loanRequest.update({
        where: { id: loan.id },
        data: {
          status: "ACTIVE",
          adminNote: adminNote || null,
          approvedDate: new Date(),
          disbursedDate: new Date(),
          monthlyDeduction: schedule[0],
          tenureMonths: months,
        },
      });

      await appendTransaction(tx, {
        userId: loan.userId,
        direction: "IN",
        category: "LOAN_DISBURSEMENT",
        amount: loan.amount,
        referenceType: "loan_request",
        referenceId: loan.id,
        description: `Emergency loan disbursed (${loan.reasonCategory})`,
      });

      return updatedLoan;
    });

    return NextResponse.json({ loan: result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to process loan request" }, { status: 500 });
  }
}
