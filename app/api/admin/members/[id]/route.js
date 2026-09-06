import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { isValidCnic } from "@/lib/validators";

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

/** Body: { status?: "ACTIVE"|"SUSPENDED", name?, cnic?, phone?, address? } — edit/suspend a member. */
export async function PATCH(request, { params }) {
  try {
    await requireAdmin(request);
    const id = Number(params.id);
    const { status, name, cnic, phone, address } = await request.json();

    if (cnic !== undefined && !isValidCnic(cnic)) {
      return NextResponse.json({ error: "CNIC must be in the format 42101-1234567-1" }, { status: 400 });
    }

    const member = await prisma.user.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(name && { name }),
        ...(cnic !== undefined && { cnic }),
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
      },
    });

    return NextResponse.json({ member });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    if (err.code === "P2002") {
      return NextResponse.json({ error: "That CNIC is already registered to another member" }, { status: 409 });
    }
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
      // "Already gone" is fine (e.g. deleted directly in the Firebase
      // console previously) — proceed with the DB delete either way. Any
      // OTHER Firebase error must be surfaced, not swallowed: silently
      // continuing would delete the DB row while the Firebase Auth user
      // (and its email) stays alive, permanently blocking that email from
      // ever registering again with "auth/email-already-in-use".
      if (err.code !== "auth/user-not-found") {
        console.error(`Firebase user delete failed for ${member.firebaseUid}:`, err);
        return NextResponse.json(
          { error: `Failed to delete Firebase account: ${err.message}. Member NOT deleted — try again.` },
          { status: 502 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
