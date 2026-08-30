/**
 * Due date is the 30th of the month. If that falls on a Sunday, roll to the
 * next working day (Monday). Months shorter than 30 days (Feb) use their
 * last day instead.
 *
 * Built entirely on UTC getters/Date.UTC so the calendar date is the same
 * regardless of which timezone the server process happens to be running in
 * (dev machine, Vercel, etc.) — a due date is a calendar date with no
 * meaningful time-of-day, and mixing local-time construction with
 * UTC-parsed date strings elsewhere is what causes off-by-one-day display
 * bugs. Pair with lib/formatDate.js on the client (renders with
 * timeZone: "UTC") to keep both ends consistent.
 */
export function computeDueDateForMonth(year, monthIndex0) {
  const lastDayOfMonth = new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
  const day = Math.min(30, lastDayOfMonth);
  let due = new Date(Date.UTC(year, monthIndex0, day));
  if (due.getUTCDay() === 0) {
    due = new Date(Date.UTC(year, monthIndex0, day + 1));
  }
  return due;
}

/** Builds the full due-date schedule for a member's cycle, starting from joinDate. */
export function buildInstallmentSchedule(joinDate, tenureMonths) {
  const start = new Date(joinDate);
  let year = start.getUTCFullYear();
  let month = start.getUTCMonth();

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
