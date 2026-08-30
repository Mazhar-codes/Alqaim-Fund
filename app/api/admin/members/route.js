import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** GET /api/admin/members?q=USR001 — search by memberId, name, CNIC or phone. */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const q = request.nextUrl.searchParams.get("q")?.trim();

    const members = await prisma.user.findMany({
      where: {
        role: "MEMBER",
        ...(q && {
          OR: [
            { memberId: { contains: q, mode: "insensitive" } },
            { name: { contains: q, mode: "insensitive" } },
            { cnic: { contains: q } },
            { phone: { contains: q } },
          ],
        }),
      },
      include: { plan: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    return NextResponse.json({ members });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load members" }, { status: 500 });
  }
}
