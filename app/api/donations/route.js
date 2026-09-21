import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DONATION_PURPOSES } from "@/lib/donationPurposes";

const VALID_PURPOSES = DONATION_PURPOSES.map((p) => p.value);

// Prevents Next.js from statically caching the GET below at build/deploy time —
// see the same fix in app/api/gallery/route.js for why that's a real risk
// here (bare GET(), no request param, no dynamic APIs used).
export const dynamic = "force-dynamic";

/**
 * POST /api/donations — public, no auth required. Anyone (member or fully
 * anonymous visitor) can submit a donation record from the landing page's
 * "Donate" modal. Body: { donorName, donorPhone, amount, purpose, transactionId?, proofUrl? }
 * Recorded as PENDING — it only counts toward totals once an admin approves it.
 */
export async function POST(request) {
  try {
    const { donorName, donorPhone, amount, purpose, transactionId, proofUrl } = await request.json();
    if (!donorName || !donorPhone || !amount) {
      return NextResponse.json({ error: "Name, phone and amount are required" }, { status: 400 });
    }
    if (!VALID_PURPOSES.includes(purpose)) {
      return NextResponse.json({ error: "A valid donation purpose is required" }, { status: 400 });
    }

    const donation = await prisma.donation.create({
      data: {
        donorName,
        donorPhone,
        amount,
        purpose,
        transactionId: transactionId || null,
        proofUrl: proofUrl || null,
      },
    });

    return NextResponse.json({ donation }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to record donation" }, { status: 500 });
  }
}

/**
 * GET /api/donations — public. Returns the most recent APPROVED donations
 * (name, amount, purpose only — no phone/proof) for the homepage's scrolling
 * donations banner.
 */
export async function GET() {
  try {
    const donations = await prisma.donation.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, donorName: true, amount: true, purpose: true, createdAt: true },
    });
    return NextResponse.json({ donations });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load donations" }, { status: 500 });
  }
}
