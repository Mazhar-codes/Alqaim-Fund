import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { applyApprovedPayment } from "@/lib/payments";

/** GET /api/admin/payments?status=PENDING (default) | APPROVED | REJECTED | ALL */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const status = request.nextUrl.searchParams.get("status") || "PENDING";

    const payments = await prisma.payment.findMany({
      where: status === "ALL" ? {} : { status },
      include: { user: { select: { memberId: true, name: true, planId: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ payments });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load payment queue" }, { status: 500 });
  }
}

/**
 * Body: { memberId, amount, paymentDate, transactionId?, method? }
 * "Add Payment Manually" — for cash payments collected in person. Applied
 * and approved immediately, no verification queue involved.
 */
export async function POST(request) {
  try {
    await requireAdmin(request);
    const { memberId, amount, paymentDate, transactionId, method } = await request.json();
    if (!memberId || !amount || !paymentDate) {
      return NextResponse.json({ error: "memberId, amount and paymentDate are required" }, { status: 400 });
    }

    const member = await prisma.user.findUnique({ where: { memberId } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: member.id,
          amount,
          paymentDate: new Date(paymentDate),
          method: method || "CASH",
          transactionId: transactionId || null,
          status: "APPROVED",
          verifiedAutomatically: false,
        },
      });
      await applyApprovedPayment(tx, {
        userId: member.id,
        amount,
        paymentDate: new Date(paymentDate),
        transactionId,
        proofUrl: null,
      });
      return created;
    });

    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}

/**
 * Body: { paymentId, action: "approve"|"reject", rejectReason? }
 * On approve: applies the payment to the member's oldest unpaid installment
 * and appends the ledger entry (same helper the auto-verify path uses).
 */
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { paymentId, action, rejectReason } = await request.json();
    if (!paymentId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "paymentId and a valid action are required" }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id: Number(paymentId) } });
    if (!payment) return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    if (payment.status !== "PENDING") {
      return NextResponse.json({ error: "Payment already processed" }, { status: 409 });
    }

    if (action === "reject") {
      const updated = await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REJECTED", rejectReason: rejectReason || "Rejected by admin" },
      });
      return NextResponse.json({ payment: updated });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const approved = await tx.payment.update({ where: { id: payment.id }, data: { status: "APPROVED" } });
      await applyApprovedPayment(tx, {
        userId: payment.userId,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        transactionId: payment.transactionId,
        proofUrl: payment.proofUrl,
      });
      return approved;
    });

    return NextResponse.json({ payment: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to process payment" }, { status: 500 });
  }
}
