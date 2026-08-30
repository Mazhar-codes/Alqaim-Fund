import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/auth/lookup?loginId=USR001
 * Public endpoint: resolves a MemberID (or the admin username) to the email
 * address Firebase Auth actually uses, so the login page can offer a
 * "MemberID + password" UX while Firebase signs in with email underneath.
 */
export async function GET(request) {
  const loginId = request.nextUrl.searchParams.get("loginId")?.trim();
  if (!loginId) return NextResponse.json({ error: "loginId is required" }, { status: 400 });

  const user = await prisma.user.findUnique({
    where: { memberId: loginId.toUpperCase() },
    select: { email: true, status: true },
  });

  if (!user) return NextResponse.json({ error: "No account with that ID" }, { status: 404 });
  if (user.status === "SUSPENDED") {
    return NextResponse.json({ error: "This account has been suspended" }, { status: 403 });
  }

  return NextResponse.json({ email: user.email });
}
