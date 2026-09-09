import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getDonationBalance } from "@/lib/donations";

/** GET — admin-only list of every donation expense ever recorded, newest first. */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const expenses = await prisma.donationExpense.findMany({ orderBy: { spentDate: "desc" } });
    const balance = await getDonationBalance(prisma);
    return NextResponse.json({ expenses, balance });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load donation expenses" }, { status: 500 });
  }
}

/**
 * Body: { description, amount, spentDate, proofUrl? }
 * Records money spent out of the approved-donations pool. Can never exceed
 * what's actually available — same guard shape as member Charges.
 */
export async function POST(request) {
  try {
    await requireAdmin(request);
    const { description, amount, spentDate, proofUrl } = await request.json();
    if (!description || !amount || !spentDate || Number(amount) <= 0) {
      return NextResponse.json({ error: "description, a positive amount, and spentDate are required" }, { status: 400 });
    }

    const { available } = await getDonationBalance(prisma);
    if (Number(amount) > available) {
      return NextResponse.json(
        { error: `Cannot record Rs. ${Number(amount).toLocaleString()} — only Rs. ${available.toLocaleString()} is available in the donations pool.` },
        { status: 400 }
      );
    }

    const expense = await prisma.donationExpense.create({
      data: {
        description,
        amount,
        spentDate: new Date(spentDate),
        proofUrl: proofUrl || null,
      },
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to record donation expense" }, { status: 500 });
  }
}
