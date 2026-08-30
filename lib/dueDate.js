/**
 * Due date is the 30th of the month. If that falls on a Sunday, roll to the
 * next working day (Monday). Months shorter than 30 days (Feb) use their
 * last day instead.
 */
export function computeDueDateForMonth(year, monthIndex0) {
  const lastDayOfMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  const day = Math.min(30, lastDayOfMonth);
  let due = new Date(year, monthIndex0, day);
  if (due.getDay() === 0) {
    due = new Date(year, monthIndex0, day + 1);
  }
  return due;
}

/** Builds the full due-date schedule for a member's cycle, starting from joinDate. */
export function buildInstallmentSchedule(joinDate, tenureMonths) {
  const start = new Date(joinDate);
  let year = start.getFullYear();
  let month = start.getMonth();

  const firstDue = computeDueDateForMonth(year, month);
  if (start > firstDue) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  const schedule = [];
  for (let i = 0; i < tenureMonths; i++) {
    schedule.push({ installmentNumber: i + 1, dueDate: computeDueDateForMonth(year, month) });
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }
  return schedule;
}

/** Next unpaid installment's due date, for the dashboard "Next Due Date" card. */
export function nextDueDate(installments) {
  const upcoming = installments
    .filter((i) => i.status !== "PAID")
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
  return upcoming[0]?.dueDate ?? null;
}
