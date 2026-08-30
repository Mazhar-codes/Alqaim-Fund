export const EMERGENCY_REASONS = [
  { value: "DEATH_IN_FAMILY", label: "Death in Family" },
  { value: "ACCIDENT", label: "Accident" },
  { value: "MEDICAL_EMERGENCY", label: "Medical Emergency / Hospitalization" },
  { value: "OTHER_EMERGENCY", label: "Other Genuine Emergency" },
];

const ACTIVE_LOAN_STATUSES = ["PENDING", "APPROVED", "ACTIVE"];

/**
 * A member is eligible to apply once they've paid the minimum number of
 * installments AND have no loan already pending/active. Loans are strictly
 * emergency-only (see EMERGENCY_REASONS) — that requirement is enforced by
 * the application form, not here.
 */
export function getLoanEligibility({ paidInstallments, minInstallments, existingLoans }) {
  const hasOpenLoan = existingLoans.some((l) => ACTIVE_LOAN_STATUSES.includes(l.status));
  if (hasOpenLoan) {
    return { eligible: false, reason: "You already have a loan request in progress." };
  }
  if (paidInstallments < minInstallments) {
    const remaining = minInstallments - paidInstallments;
    return {
      eligible: false,
      reason: `Not Eligible — ${remaining} more installment${remaining === 1 ? "" : "s"} needed.`,
    };
  }
  return { eligible: true, reason: null };
}

export function getMaxLoanAmount(plan) {
  return Number(plan.monthlyAmount) * plan.maxLoanMultiplier;
}

/**
 * Splits a loan into equal monthly deductions with no interest. Any rounding
 * remainder (paisa) is absorbed into the final installment so the sum always
 * equals exactly `amount` — the member never pays back more than they borrowed.
 */
export function buildRepaymentSchedule(amount, tenureMonths) {
  const base = Math.floor((amount / tenureMonths) * 100) / 100;
  const schedule = Array.from({ length: tenureMonths }, () => base);
  const roundedTotal = base * tenureMonths;
  schedule[tenureMonths - 1] = Math.round((amount - roundedTotal + base) * 100) / 100;
  return schedule;
}
