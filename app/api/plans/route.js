import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET() {
  const plans = await prisma.plan.findMany({ orderBy: { monthlyAmount: "asc" } });
  return NextResponse.json({ plans });
}

/** Admin-only: edit plan amount / tenure / loan multiplier. Body: { id, ...fields } */
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { id, name, monthlyAmount, tenureMonths, maxLoanMultiplier } = await request.json();
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    const plan = await prisma.plan.update({
      where: { id: Number(id) },
      data: {
        ...(name && { name }),
        ...(monthlyAmount !== undefined && { monthlyAmount }),
        ...(tenureMonths !== undefined && { tenureMonths: Number(tenureMonths) }),
        ...(maxLoanMultiplier !== undefined && { maxLoanMultiplier: Number(maxLoanMultiplier) }),
      },
    });
    return NextResponse.json({ plan });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
