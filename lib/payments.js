import { appendTransaction } from "./ledger";

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

  const updatedInstallment = await tx.installment.update({
    where: { id: installment.id },
    data: { status: "PAID", paidDate: paymentDate, transactionId, proofUrl },
  });

  await tx.user.update({
    where: { id: userId },
    data: { paidInstallments: { increment: 1 }, totalPaid: { increment: amount } },
  });

  const planPortion = Number(installment.amount);
  const loanPortion = Number(installment.loanDeduction);

  await appendTransaction(tx, {
    userId,
    direction: "OUT",
    category: "INSTALLMENT_PAYMENT",
    amount: planPortion,
    referenceType: "installment",
    referenceId: installment.id,
    description: `Installment #${installment.installmentNumber} payment`,
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
  const sameMonth = paid.getFullYear() === now.getFullYear() && paid.getMonth() === now.getMonth();

  return amountMatches && sameMonth;
}
