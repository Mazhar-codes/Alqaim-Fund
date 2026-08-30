/**
 * One-time setup: creates the Firebase admin user + matching Prisma User row,
 * and sets the `role: "admin"` custom claim used by lib/auth.js.
 *
 * Reads ADMIN_SEED_USERNAME / ADMIN_SEED_PASSWORD / ADMIN_SEED_EMAIL from
 * the environment (see .env.example). Run with:
 *   node -r dotenv/config scripts/seed-admin.js
 */
const { PrismaClient } = require("@prisma/client");
const { cert, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");

const prisma = new PrismaClient();

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: (process.env.FIREBASE_ADMIN_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  }),
});
const adminAuth = getAuth();

async function main() {
  const username = process.env.ADMIN_SEED_USERNAME || "admin";
  const password = process.env.ADMIN_SEED_PASSWORD || "admin123";
  const email = process.env.ADMIN_SEED_EMAIL || "admin@alqaimfund.local";

  let firebaseUser;
  try {
    firebaseUser = await adminAuth.getUserByEmail(email);
    console.log(`Firebase user already exists for ${email} (uid ${firebaseUser.uid})`);
  } catch {
    firebaseUser = await adminAuth.createUser({ email, password, displayName: "Admin" });
    console.log(`Created Firebase user for ${email} (uid ${firebaseUser.uid})`);
  }

  await adminAuth.setCustomUserClaims(firebaseUser.uid, { role: "admin" });

  await prisma.user.upsert({
    where: { firebaseUid: firebaseUser.uid },
    update: { role: "ADMIN", memberId: username.toUpperCase() },
    create: {
      firebaseUid: firebaseUser.uid,
      memberId: username.toUpperCase(),
      role: "ADMIN",
      name: "Admin",
      phone: "0000000000",
      email,
    },
  });

  console.log(`Admin ready — login with username "${username}" and the configured password.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
