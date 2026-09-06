import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET() {
  const plans = await prisma.plan.findMany({ orderBy: { monthlyAmount: "asc" } });
  return NextResponse.json({ plans });
}

/** Picks the next unused single-letter plan code (A, B, C, ... continuing past any gaps left by deleted plans). */
async function nextPlanCode() {
  const existing = new Set((await prisma.plan.findMany({ select: { code: true } })).map((p) => p.code));
  for (let i = 0; i < 26; i++) {
    const code = String.fromCharCode(65 + i);
    if (!existing.has(code)) return code;
  }
  throw new Error("No more single-letter plan codes available");
}

/**
 * Admin-only: create a new plan. Body: { name, monthlyAmount, tenureMonths?, maxLoanMultiplier? }
 * tenureMonths/maxLoanMultiplier default to Settings.defaultTenureMonths / 20 (the schema default)
 * when omitted. The plan's code (A/B/C/...) is generated automatically. New plans immediately show
 * up on the public landing page and registration form, both of which fetch this same endpoint.
 */
export async function POST(request) {
  try {
    await requireAdmin(request);
    const { name, monthlyAmount, tenureMonths, maxLoanMultiplier } = await request.json();
    if (!name || !monthlyAmount) {
      return NextResponse.json({ error: "name and monthlyAmount are required" }, { status: 400 });
    }

    const settings = await prisma.settings.findUnique({ where: { id: 1 } });
    const code = await nextPlanCode();

    const plan = await prisma.plan.create({
      data: {
        code,
        name,
        monthlyAmount,
        tenureMonths: tenureMonths !== undefined ? Number(tenureMonths) : settings?.defaultTenureMonths ?? 12,
        ...(maxLoanMultiplier !== undefined && { maxLoanMultiplier: Number(maxLoanMultiplier) }),
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 });
  }
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
