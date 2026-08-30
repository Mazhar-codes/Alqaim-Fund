import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { getLoanEligibility, getMaxLoanAmount, EMERGENCY_REASONS } from "@/lib/loan";

export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const [plan, settings, loans] = await Promise.all([
      prisma.plan.findUnique({ where: { id: user.planId } }),
      prisma.settings.upsert({ where: { id: 1 }, update: {}, create: {} }),
      prisma.loanRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { repayments: true } }),
    ]);

    const eligibility = getLoanEligibility({
      paidInstallments: user.paidInstallments,
      minInstallments: settings.minInstallmentsForLoan,
      existingLoans: loans,
    });

    return NextResponse.json({
      eligibility,
      maxLoanAmount: getMaxLoanAmount(plan),
      reasons: EMERGENCY_REASONS,
      loans,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load loan info" }, { status: 500 });
  }
}

/**
 * Body: { amount, reasonCategory, description, proofUrl }
 * Loans are emergency-only — reasonCategory must be one of EMERGENCY_REASONS
 * and description is required so admin has enough context to judge the
 * request before approving. This only files the request; admin approval
 * (PATCH /api/admin/loans) is what actually releases funds.
 */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const { amount, reasonCategory, description, proofUrl } = await request.json();

    if (!amount || !reasonCategory || !description) {
      return NextResponse.json(
        { error: "amount, reasonCategory and description are all required" },
        { status: 400 }
      );
    }
    if (!EMERGENCY_REASONS.some((r) => r.value === reasonCategory)) {
      return NextResponse.json({ error: "Invalid emergency reason" }, { status: 400 });
    }

    const [plan, settings, existingLoans] = await Promise.all([
      prisma.plan.findUnique({ where: { id: user.planId } }),
      prisma.settings.upsert({ where: { id: 1 }, update: {}, create: {} }),
      prisma.loanRequest.findMany({ where: { userId: user.id } }),
    ]);

    const eligibility = getLoanEligibility({
      paidInstallments: user.paidInstallments,
      minInstallments: settings.minInstallmentsForLoan,
      existingLoans,
    });
    if (!eligibility.eligible) {
      return NextResponse.json({ error: eligibility.reason }, { status: 403 });
    }

    const maxAmount = getMaxLoanAmount(plan);
    if (Number(amount) > maxAmount) {
      return NextResponse.json({ error: `Amount exceeds max loan of Rs. ${maxAmount}` }, { status: 400 });
    }

    const loan = await prisma.loanRequest.create({
      data: {
        userId: user.id,
        amount,
        reasonCategory,
        description,
        proofUrl: proofUrl || null,
        status: "PENDING",
      },
    });

    return NextResponse.json(
      { loan, message: "Request submitted. Funds are released only after admin approval." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to submit loan request" }, { status: 500 });
  }
}
