import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";
import { applyApprovedPayment, passesAutoVerification } from "@/lib/payments";

export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const payments = await prisma.payment.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ payments });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load payments" }, { status: 500 });
  }
}

/**
 * Body: { amount, paymentDate, transactionId, proofUrl }
 * proofUrl is a Firebase Storage download URL — the client uploads the
 * screenshot directly to Storage and only sends us the resulting URL.
 */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const { amount, paymentDate, transactionId, proofUrl } = await request.json();

    if (!amount || !paymentDate || !proofUrl) {
      return NextResponse.json({ error: "amount, paymentDate and proofUrl are required" }, { status: 400 });
    }

    const oldestUnpaid = await prisma.installment.findFirst({
      where: { userId: user.id, status: { not: "PAID" } },
      orderBy: { installmentNumber: "asc" },
    });

    const autoApprove = passesAutoVerification(oldestUnpaid, amount, paymentDate);

    const payment = await prisma.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: {
          userId: user.id,
          amount,
          paymentDate: new Date(paymentDate),
          transactionId: transactionId || null,
          proofUrl,
          status: autoApprove ? "APPROVED" : "PENDING",
          verifiedAutomatically: autoApprove,
        },
      });

      if (autoApprove) {
        await applyApprovedPayment(tx, {
          userId: user.id,
          amount,
          paymentDate: new Date(paymentDate),
          transactionId,
          proofUrl,
        });
      }

      return created;
    });

    return NextResponse.json(
      {
        payment,
        message: autoApprove
          ? "Payment verified automatically and applied."
          : "Payment uploaded — pending admin verification.",
      },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}
