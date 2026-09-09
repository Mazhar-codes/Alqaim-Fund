import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** Admin dashboard overview: the numbers on the top stat cards. */
export async function GET(request) {
  try {
    await requireAdmin(request);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalMembers,
      collectionAgg,
      activeLoans,
      activeLoanAgg,
      pendingPayments,
      pendingLoans,
      pendingDonations,
      donationAgg,
      suspendedMembers,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "MEMBER" } }),
      // Real money actually collected, from the ledger — not the scheduled
      // installment.amount, which may be more than what was really paid.
      prisma.transaction.aggregate({
        where: {
          direction: "OUT",
          category: { in: ["INSTALLMENT_PAYMENT", "LOAN_REPAYMENT"] },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.loanRequest.count({ where: { status: "ACTIVE" } }),
      prisma.loanRequest.aggregate({ where: { status: "ACTIVE" }, _sum: { amount: true, totalRepaid: true } }),
      prisma.payment.count({ where: { status: "PENDING" } }),
      prisma.loanRequest.count({ where: { status: "PENDING" } }),
      prisma.donation.count({ where: { status: "PENDING" } }),
      // Only APPROVED donations count toward the total — a pending or
      // rejected submission isn't verified money yet.
      prisma.donation.aggregate({ where: { status: "APPROVED" }, _sum: { amount: true } }),
      prisma.user.count({ where: { role: "MEMBER", status: "SUSPENDED" } }),
    ]);

    const collectionThisMonth = Number(collectionAgg._sum.amount || 0);
    const loanOutstanding = Number(activeLoanAgg._sum.amount || 0) - Number(activeLoanAgg._sum.totalRepaid || 0);
    const totalDonations = Number(donationAgg._sum.amount || 0);

    return NextResponse.json({
      totalMembers,
      suspendedMembers,
      collectionThisMonth,
      activeLoans,
      loanOutstanding,
      totalDonations,
      pendingPaymentVerifications: pendingPayments,
      pendingLoanRequests: pendingLoans,
      pendingDonationVerifications: pendingDonations,
      pendingVerifications: pendingPayments + pendingLoans + pendingDonations,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
