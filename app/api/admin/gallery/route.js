import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** GET — admin-only list, same data as the public endpoint (kept separate so the admin page never depends on a public route). */
export async function GET(request) {
  try {
    await requireAdmin(request);
    const images = await prisma.galleryImage.findMany({ orderBy: { createdAt: "desc" } });
    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }
}

/** POST — admin-only, adds a photo already uploaded to Cloudinary. Body: { imageUrl, caption? } */
export async function POST(request) {
  try {
    await requireAdmin(request);
    const { imageUrl, caption } = await request.json();
    if (!imageUrl) return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });

    const image = await prisma.galleryImage.create({ data: { imageUrl, caption: caption || null } });
    return NextResponse.json({ image }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to add photo" }, { status: 500 });
  }
}
