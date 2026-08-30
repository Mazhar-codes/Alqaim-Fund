import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { prisma } from "@/lib/prisma";
import { generateNextMemberId, isValidCnic } from "@/lib/memberId";
import { buildInstallmentSchedule } from "@/lib/dueDate";
import { notifyMemberId } from "@/lib/notify";

/**
 * Body: { idToken, name, cnic, phone, address, planId }
 * The Firebase user must already exist (client called
 * createUserWithEmailAndPassword before hitting this endpoint) — idToken
 * proves ownership of that account's uid + email.
 */
export async function POST(request) {
  const adminAuth = getAdminAuth();
  const body = await request.json();
  const { idToken, name, cnic, phone, address, planId } = body;

  if (!idToken) return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
  if (!name || !cnic || !phone || !planId) {
    return NextResponse.json({ error: "name, cnic, phone and planId are required" }, { status: 400 });
  }
  if (!isValidCnic(cnic)) {
    return NextResponse.json({ error: "CNIC must be in the format 42101-1234567-1" }, { status: 400 });
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Invalid or expired idToken" }, { status: 401 });
  }
  if (!decoded.email) {
    return NextResponse.json({ error: "Firebase account has no email on file" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { firebaseUid: decoded.uid } });
  if (existing) {
    return NextResponse.json({ error: "This account is already registered" }, { status: 409 });
  }

  const plan = await prisma.plan.findUnique({ where: { id: Number(planId) } });
  if (!plan) return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });

  try {
    const memberId = await generateNextMemberId();
    const joinDate = new Date();
    const schedule = buildInstallmentSchedule(joinDate, plan.tenureMonths);

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          firebaseUid: decoded.uid,
          memberId,
          name,
          cnic,
          phone,
          email: decoded.email,
          address: address || null,
          planId: plan.id,
          joinDate,
        },
      });

      await tx.installment.createMany({
        data: schedule.map((s) => ({
          userId: created.id,
          installmentNumber: s.installmentNumber,
          amount: plan.monthlyAmount,
          dueDate: s.dueDate,
        })),
      });

      return created;
    });

    await adminAuth.setCustomUserClaims(decoded.uid, { role: "member" });
    await notifyMemberId({ name, phone, email: decoded.email, memberId });

    return NextResponse.json({ memberId: user.memberId }, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "CNIC or email already registered" }, { status: 409 });
    }
    console.error(err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
