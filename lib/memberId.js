import { prisma } from "./prisma";

const PREFIX = "USR";
const PAD = 3; // USR001, USR010, USR100, USR1000 (grows past the pad naturally)

/** Generates the next sequential MemberID, e.g. USR001, USR002, ... */
export async function generateNextMemberId() {
  const last = await prisma.user.findFirst({
    where: { memberId: { startsWith: PREFIX } },
    orderBy: { id: "desc" },
    select: { memberId: true },
  });

  let nextNumber = 1;
  if (last?.memberId) {
    const numericPart = parseInt(last.memberId.replace(PREFIX, ""), 10);
    if (!Number.isNaN(numericPart)) nextNumber = numericPart + 1;
  }

  return `${PREFIX}${String(nextNumber).padStart(PAD, "0")}`;
}

const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

export function isValidCnic(cnic) {
  return typeof cnic === "string" && CNIC_REGEX.test(cnic);
}
