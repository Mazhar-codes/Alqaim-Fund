import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

/** POST — records that the signed-in member has read and accepted the Terms & Conditions, right after registration. */
export async function POST(request) {
  try {
    const { user } = await requireUser(request);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { termsAcceptedAt: new Date() },
    });
    return NextResponse.json({ termsAcceptedAt: updated.termsAcceptedAt });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to record acceptance" }, { status: 500 });
  }
}
