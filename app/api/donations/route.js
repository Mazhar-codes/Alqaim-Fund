import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/donations — public, no auth required. Anyone (member or fully
 * anonymous visitor) can submit a donation record from the landing page's
 * "Donate" modal. Body: { donorName, donorPhone, amount, transactionId?, proofUrl? }
 * Recorded as PENDING — it only counts toward totals once an admin approves it.
 */
export async function POST(request) {
  try {
    const { donorName, donorPhone, amount, transactionId, proofUrl } = await request.json();
    if (!donorName || !donorPhone || !amount) {
      return NextResponse.json({ error: "Name, phone and amount are required" }, { status: 400 });
    }

    const donation = await prisma.donation.create({
      data: {
        donorName,
        donorPhone,
        amount,
        transactionId: transactionId || null,
        proofUrl: proofUrl || null,
      },
    });

    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
  }
}
