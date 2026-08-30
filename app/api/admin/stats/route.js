import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** Admin dashboard overview: the numbers on the top stat cards. */
export async function GET(request) {
  try {
    await requireAdmin(request);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalMembers, collectionAgg, activeLoans, activeLoanAgg, pendingPayments, pendingLoans, suspendedMembers] =
      await Promise.all([
        prisma.user.count({ where: { role: "MEMBER" } }),
        prisma.installment.aggregate({
          where: { status: "PAID", paidDate: { gte: startOfMonth } },
          _sum: { amount: true, loanDeduction: true },
        }),
        prisma.loanRequest.count({ where: { status: "ACTIVE" } }),
        prisma.loanRequest.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true, totalRepaid: true } }),
        prisma.payment.count({ where: { status: "PENDING" } }),
        prisma.loanRequest.count({ where: { status: "PENDING" } }),
        prisma.user.count({ where: { role: "MEMBER", status: "SUSPENDED" } }),
      ]);

    const collectionThisMonth =
      Number(collectionAgg._sum.amount || 0) + Number(collectionAgg._sum.loanDeduction || 0);
    const loanOutstanding = Number(activeLoanAgg._sum.amount || 0) - Number(activeLoanAgg._sum.totalRepaid || 0);

    return NextResponse.json({
      totalMembers,
      suspendedMembers,
      collectionThisMonth,
      activeLoans,
      loanOutstanding,
      pendingPaymentVerifications: pendingPayments,
      pendingLoanRequests: pendingLoans,
      pendingVerifications: pendingPayments + pendingLoans,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
