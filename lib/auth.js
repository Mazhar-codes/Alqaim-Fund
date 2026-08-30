import { getAdminAuth } from "./firebaseAdmin";
import { prisma } from "./prisma";

export class AuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the Firebase ID token on the Authorization: Bearer <token> header
 * and loads the matching Prisma User row. Throws AuthError on any failure —
 * callers should catch and return NextResponse.json({error}, {status}).
 */
export async function requireUser(request) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new AuthError("Missing Authorization bearer token", 401);

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    throw new AuthError("Invalid or expired token", 401);
  }

  const user = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  if (!user) throw new AuthError("No profile found for this account", 404);
  if (user.status === "SUSPENDED") throw new AuthError("Account suspended", 403);

  return { decoded, user };
}

/** Same as requireUser but also enforces role === ADMIN. */
export async function requireAdmin(request) {
  const ctx = await requireUser(request);
  if (ctx.user.role !== "ADMIN") throw new AuthError("Admin access required", 403);
  return ctx;
}
