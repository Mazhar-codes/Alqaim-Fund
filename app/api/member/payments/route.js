import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

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
 * proofUrl is a Cloudinary secure_url — the client uploads the screenshot
 * directly to Cloudinary and only sends us the resulting URL.
 */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const { amount, paymentDate, transactionId, proofUrl } = await request.json();

    if (!amount || !paymentDate || !proofUrl) {
      return NextResponse.json({ error: "amount, paymentDate and proofUrl are required" }, { status: 400 });
    }

    // Every member-submitted payment goes to the admin verification queue —
    // no auto-approval. Admin must review the screenshot/transaction ID and
    // approve or reject it via /admin/payments before it's applied.
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount,
        paymentDate: new Date(paymentDate),
        transactionId: transactionId || null,
        proofUrl,
        status: "PENDING",
        verifiedAutomatically: false,
      },
    });

    return NextResponse.json(
      { payment, message: "Payment uploaded — pending admin verification." },
      { status: 201 }
    );
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to submit payment" }, { status: 500 });
  }
}
