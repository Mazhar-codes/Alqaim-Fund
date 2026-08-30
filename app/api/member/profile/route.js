import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, AuthError } from "@/lib/auth";

export async function GET(request) {
  try {
    const { user } = await requireUser(request);
    const { firebaseUid, ...safe } = user; // eslint-disable-line no-unused-vars
    return NextResponse.json({ profile: safe });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

/**
 * Body: { phone?, address?, photoUrl? }
 * photoUrl is a Cloudinary secure_url — the client uploads the picture
 * directly to Cloudinary and only sends us the resulting URL.
 * Password changes go through Firebase client SDK directly
 * (reauthenticateWithCredential + updatePassword) — this endpoint never
 * touches credentials.
 */
export async function PATCH(request) {
  try {
    const { user } = await requireUser(request);
    const { phone, address, photoUrl } = await request.json();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
        ...(photoUrl !== undefined && { photoUrl }),
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
