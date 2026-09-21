import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/** DELETE — admin-only, removes one gallery photo (only the DB record; the Cloudinary asset itself is left in place). */
export async function DELETE(request, { params }) {
  try {
    await requireAdmin(request);
    const id = Number(params.id);

    const image = await prisma.galleryImage.findUnique({ where: { id } });
    if (!image) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

    await prisma.galleryImage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to delete photo" }, { status: 500 });
  }
}
