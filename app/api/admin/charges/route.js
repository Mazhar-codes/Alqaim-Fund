import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** GET — admin-only, fund-wide list of every charge deduction ever recorded, across all members, newest first. */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const charges = await prisma.charge.findMany({
      include: { user: { select: { memberId: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ charges });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load charges" }, { status: 500 });
  }
}
