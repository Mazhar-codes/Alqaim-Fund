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
 * Body: { phone?, address? }
 * Password changes go through Firebase client SDK directly
 * (reauthenticateWithCredential + updatePassword) — this endpoint never
 * touches credentials.
 */
export async function PATCH(request) {
  try {
    const { user } = await requireUser(request);
    const { phone, address } = await request.json();

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(phone && { phone }),
        ...(address !== undefined && { address }),
      },
    });

    return NextResponse.json({ profile: updated });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error(err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
