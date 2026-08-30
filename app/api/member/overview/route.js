import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { nextDueDate } from "@/lib/dueDate";

export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const [plan, installments, activeLoan] = await Promise.all([
      prisma.plan.findUnique({ where: { id: user.planId } }),
      prisma.installment.findMany({ where: { userId: user.id }, orderBy: { installmentNumber: "asc" } }),
      prisma.loanRequest.findFirst({
        where: { userId: user.id, status: { in: ["PENDING", "APPROVED", "ACTIVE"] } },
        include: { repayments: true },
      }),
    ]);

    const totalPlanValue = Number(plan.monthlyAmount) * plan.tenureMonths;

    return NextResponse.json({
      member: {
        memberId: user.memberId,
        name: user.name,
        status: user.status,
        joinDate: user.joinDate,
      },
      plan: { name: plan.name, code: plan.code, monthlyAmount: plan.monthlyAmount, tenureMonths: plan.tenureMonths },
      totalPaid: user.totalPaid,
      totalRemaining: Math.max(0, totalPlanValue - Number(user.totalPaid)),
      paidInstallments: user.paidInstallments,
      nextDueDate: nextDueDate(installments),
      activeLoan,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load overview" }, { status: 500 });
  }
}
