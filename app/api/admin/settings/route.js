import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const settings = await prisma.settings.upsert({ where: { id: 1 }, update: {}, create: {} });
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

/** Body: { defaultTenureMonths?, minInstallmentsForLoan?, smsEnabled?, companyBankDetails? } */
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { defaultTenureMonths, minInstallmentsForLoan, smsEnabled, companyBankDetails } = await request.json();

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      update: {
        ...(defaultTenureMonths !== undefined && { defaultTenureMonths: Number(defaultTenureMonths) }),
        ...(minInstallmentsForLoan !== undefined && { minInstallmentsForLoan: Number(minInstallmentsForLoan) }),
        ...(smsEnabled !== undefined && { smsEnabled: Boolean(smsEnabled) }),
        ...(companyBankDetails !== undefined && { companyBankDetails }),
      },
      create: {
        id: 1,
        ...(defaultTenureMonths !== undefined && { defaultTenureMonths: Number(defaultTenureMonths) }),
        ...(minInstallmentsForLoan !== undefined && { minInstallmentsForLoan: Number(minInstallmentsForLoan) }),
        ...(smsEnabled !== undefined && { smsEnabled: Boolean(smsEnabled) }),
        ...(companyBankDetails !== undefined && { companyBankDetails }),
      },
    });

    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
