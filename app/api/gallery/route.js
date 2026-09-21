import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Without this, Next.js can statically cache this route at build/deploy time
// (no `request` param, no dynamic APIs used) and keep serving that frozen
// snapshot to every visitor — which is exactly what silently hid newly
// uploaded gallery photos on production.
export const dynamic = "force-dynamic";

/** GET /api/gallery — public. Every gallery photo, newest first, for the homepage Gallery section. */
export async function GET() {
  try {
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ images });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }
}
