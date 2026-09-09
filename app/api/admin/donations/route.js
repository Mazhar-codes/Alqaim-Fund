import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** GET /api/admin/donations?status=PENDING|APPROVED|REJECTED|ALL (default ALL) */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const status = request.nextUrl.searchParams.get("status") || "ALL";
    const donations = await prisma.donation.findMany({
      where: status === "ALL" ? {} : { status },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ donations });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 });
  }
}

/**
 * Body: { donationId, action: "approve"|"reject", rejectReason? }
 * A donation only counts toward totals/reports once approved here.
 */
export async function PATCH(request) {
  try {
    await requireAdmin(request);
    const { donationId, action, rejectReason } = await request.json();
    if (!donationId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "donationId and a valid action are required" }, { status: 400 });
    }

    const donation = await prisma.donation.findUnique({ where: { id: Number(donationId) } });
    if (!donation) return NextResponse.json({ error: "Donation not found" }, { status: 404 });
    if (donation.status !== "PENDING") {
      return NextResponse.json({ error: "Donation already processed" }, { status: 409 });
    }

    const updated = await prisma.donation.update({
      where: { id: donation.id },
      data:
        action === "approve"
          ? { status: "APPROVED" }
          : { status: "REJECTED", rejectReason: rejectReason || "Rejected by admin" },
    });

    return NextResponse.json({ donation: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to process donation" }, { status: 500 });
  }
}
