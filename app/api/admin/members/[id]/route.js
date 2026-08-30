import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

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
