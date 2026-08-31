import { appendTransaction } from "./ledger";

/** The amount actually due on a member's oldest unpaid installment, or null if fully paid up. */
export async function getDueAmount(prisma, userId) {
  const installment = await prisma.installment.findFirst({
    where: { userId, status: { not: "PAID" } },
    orderBy: { installmentNumber: "asc" },
    select: { amount: true, loanDeduction: true },
  });
  if (!installment) return null;
  return Number(installment.amount) + Number(installment.loanDeduction);
}

/**
 * Applies an APPROVED payment to the member's oldest unpaid installment,
 * bumps their counters, and appends the matching ledger entry. Shared by the
 * auto-verification path (member upload) and the admin approve path, so the
 * bookkeeping can never drift between the two.
 */
export async function applyApprovedPayment(tx, { userId, amount, paymentDate, transactionId, proofUrl }) {
  const installment = await tx.installment.findFirst({
    where: { userId, status: { not: "PAID" } },
    orderBy: { installmentNumber: "asc" },
  });
  if (!installment) throw new Error("No pending installment to apply this payment to");

  // Split the ACTUAL amount received between the plan-due portion and the
  // loan-repayment portion — never assume it matches what was due. Admin
  // approval (and manual cash entry) can mark an installment PAID even when
  // the amount is short or over, and the ledger must reflect what really
  // moved, not the scheduled amount, or it silently drifts from totalPaid.
  const dueAmount = Number(installment.amount);
  const planPortion = Math.min(Number(amount), dueAmount);
  const remainder = Number(amount) - planPortion;
  const loanPortion = Math.min(remainder, Number(installment.loanDeduction));

  const updatedInstallment = await tx.installment.update({
    where: { id: installment.id },
    data: { status: "PAID", paidDate: paymentDate, transactionId, proofUrl, amountPaid: planPortion },
  });

  await tx.user.update({
    where: { id: userId },
    data: { paidInstallments: { increment: 1 }, totalPaid: { increment: amount } },
  });

  await appendTransaction(tx, {
    userId,
    direction: "OUT",
    category: "INSTALLMENT_PAYMENT",
    amount: planPortion,
    referenceType: "installment",
    referenceId: installment.id,
    description:
      planPortion < dueAmount
        ? `Installment #${installment.installmentNumber} payment (Rs. ${dueAmount - planPortion} short of the Rs. ${dueAmount} due)`
        : `Installment #${installment.installmentNumber} payment`,
  });

  if (loanPortion > 0) {
    await recordLoanRepayment(tx, { userId, installment: updatedInstallment, loanPortion });
  }

  return updatedInstallment;
}

/** Applies the loan-deduction portion of a paid installment to the member's active loan. */
async function recordLoanRepayment(tx, { userId, installment, loanPortion }) {
  const loan = await tx.loanRequest.findFirst({ where: { userId, status: "ACTIVE" } });
  if (!loan) return; // shouldn't happen, but never block the installment payment over it

  await tx.loanRepayment.create({
    data: { loanId: loan.id, amount: loanPortion, installmentId: installment.id },
  });

  const totalRepaid = Number(loan.totalRepaid) + loanPortion;
  const isComplete = totalRepaid >= Number(loan.amount) - 0.01;

  await tx.loanRequest.update({
    where: { id: loan.id },
    data: { totalRepaid, status: isComplete ? "COMPLETED" : "ACTIVE" },
  });

  await appendTransaction(tx, {
    userId,
    direction: "OUT",
    category: "LOAN_REPAYMENT",
    amount: loanPortion,
    referenceType: "loan_request",
    referenceId: loan.id,
    description: `Loan repayment via installment #${installment.installmentNumber}`,
  });
}

/**
 * Basic auto-verification: the amount must match what's actually due on the
 * oldest unpaid installment (plan amount + any loan deduction), and the
 * payment date must fall in the current calendar month. Anything else is
 * left PENDING for the admin to check manually.
 */
export function passesAutoVerification(installment, amount, paymentDate) {
  if (!installment) return false;
  const expected = Number(installment.amount) + Number(installment.loanDeduction);
  const amountMatches = Math.abs(Number(amount) - expected) < 0.01;

  const now = new Date();
  const paid = new Date(paymentDate);
  // UTC getters: paymentDate arrives as a date-only value (UTC midnight) —
  // comparing with local getters could shift it into the wrong month
  // depending on the server process's timezone. See lib/dueDate.js.
  const sameMonth = paid.getUTCFullYear() === now.getUTCFullYear() && paid.getUTCMonth() === now.getUTCMonth();

  return amountMatches && sameMonth;
}
