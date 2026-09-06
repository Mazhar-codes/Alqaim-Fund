import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** GET — admin-only list of every donation ever submitted, newest first. */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const donations = await prisma.donation.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ donations });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 });
  }
}
