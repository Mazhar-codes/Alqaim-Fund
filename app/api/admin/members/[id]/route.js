import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";

/** Full member ledger: profile, installments, payments, loans, transactions. */
export async function GET(request, { params }) {
  try {
    await requireAdmin(request);
    const id = Number(params.id);

    const member = await prisma.user.findUnique({
      where: { id },
      include: {
        plan: true,
        installments: { orderBy: { installmentNumber: "asc" } },
        payments: { orderBy: { createdAt: "desc" } },
        loanRequests: { orderBy: { createdAt: "desc" }, include: { repayments: true } },
        transactions: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load member" }, { status: 500 });
  }
}

/** Body: { status?: "ACTIVE"|"SUSPENDED", phone?, address? } — edit/suspend a member. */
export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const id = Number(params.id);
    const { status, phone, address } = await request.json();

    const member = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
      },
    });

    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

/**
 * Permanently deletes a member account: the Firebase Auth user, and the
 * Prisma User row along with everything that cascades from it (their
 * installments, payments, loan requests/repayments, transactions). This is
 * irreversible — the admin UI requires a confirmation step before calling it.
 */
export async function DELETE(request, { params }) {
  try {
    const { user: admin } = await requireAdmin(request);
    const id = Number(params.id);

    if (admin.id === id) {
      return NextResponse.json({ error: "You cannot delete your own admin account" }, { status: 400 });
    }

    const member = await prisma.user.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });
    if (member.role === "ADMIN") {
      return NextResponse.json({ error: "Admin accounts cannot be deleted from this screen" }, { status: 400 });
    }

    try {
      await getAdminAuth().deleteUser(member.firebaseUid);
    } catch (err) {
      // Already gone from Firebase, or never existed there — fine, proceed with the DB delete.
      console.warn(`Firebase user delete failed for ${member.firebaseUid}:`, err.message);
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
