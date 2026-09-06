import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/auth/recover-memberid
 * Body: { cnic, phone }
 * Public "forgot my Member ID" recovery — there's no live email/SMS provider
 * wired up yet (see lib/notify.js), so this can't email/text the result.
 * Instead it requires BOTH the CNIC and the phone number on file to match
 * before revealing the MemberID directly in the response — two factors the
 * member already knows, and not guessable/enumerable in bulk the way a
 * single field would be.
 */
export async function POST(request) {
  const { cnic, phone } = await request.json();
  if (!cnic || !phone) {
    return NextResponse.json({ error: "CNIC and phone are required" }, { status: 400 });
  }

  const user = await prisma.user.findFirst({
    where: { cnic: cnic.trim(), phone: phone.trim() },
    select: { memberId: true, status: true },
  });

  if (!user) {
    return NextResponse.json({ error: "No account found matching that CNIC and phone number" }, { status: 404 });
  }
  if (user.status === "SUSPENDED") {
    return NextResponse.json({ error: "This account has been suspended" }, { status: 403 });
  }

  return NextResponse.json({ memberId: user.memberId });
}
