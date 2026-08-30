import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

/** Installment History Table data for the member dashboard. */
export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const installments = await prisma.installment.findMany({
      where: { userId: user.id },
      orderBy: { installmentNumber: "asc" },
    });
    return NextResponse.json({ installments });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load installments" }, { status: 500 });
  }
}
