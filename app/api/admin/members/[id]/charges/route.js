import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { appendTransaction } from "@/lib/ledger";

/**
 * POST /api/admin/members/[id]/charges
 * Body: { amount, reason? }
 * A manual admin-initiated deduction from this member's accumulated
 * balance — e.g. an administrative/service charge. Deliberately does NOT
 * touch the member's totalPaid or any Installment (their plan progress is
 * completely unaffected) — this is a separate Charge record, plus a
 * CHARGE_DEDUCTION Transaction ledger entry so the member sees a clear
 * note about it the next time they check their own Transactions page.
 *
 * Guard: a charge can never exceed the member's actual accumulated balance
 * (totalPaid, minus anything already deducted as a charge) — otherwise an
 * admin could deduct from a member who has paid nothing at all, which
 * makes no sense ("cut money from his balance" requires a real balance).
 */
export async function POST(request, { params }) {
  try {
    await requireAdmin(request);
    const id = Number(params.id);
    const { amount, reason } = await request.json();

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "A positive amount is required" }, { status: 400 });
    }

    const member = await prisma.user.findUnique({
      where: { id },
      include: { charges: { select: { amount: true } } },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    const alreadyCharged = member.charges.reduce((sum, c) => sum + Number(c.amount), 0);
    const availableBalance = Number(member.totalPaid) - alreadyCharged;
    if (Number(amount) > availableBalance) {
      return NextResponse.json(
        {
          error: `Cannot deduct Rs. ${Number(amount).toLocaleString()} — ${member.name} has only Rs. ${availableBalance.toLocaleString()} in accumulated balance (Rs. ${Number(member.totalPaid).toLocaleString()} paid, Rs. ${alreadyCharged.toLocaleString()} already charged).`,
        },
        { status: 400 }
      );
    }

    const charge = await prisma.$transaction(async (tx) => {
      const created = await tx.charge.create({
        data: { userId: id, amount, reason: reason || null },
      });
      await appendTransaction(tx, {
        userId: id,
        direction: "OUT",
        category: "CHARGE_DEDUCTION",
        amount,
        referenceType: "charge",
        referenceId: created.id,
        description: reason ? `Charges deducted: ${reason}` : "Charges deducted from your account",
      });
      return created;
    });

    return NextResponse.json({ charge }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to record charge" }, { status: 500 });
  }
}
