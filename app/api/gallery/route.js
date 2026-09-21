import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
