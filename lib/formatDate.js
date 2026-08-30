"use client";

/**
 * Formats a date for display, anchored to UTC. Due dates, payment dates,
 * join dates etc. are conceptually calendar dates with no meaningful
 * time-of-day — but they're stored as timestamps, and the server that
 * creates them may be in a different timezone than the browser rendering
 * them. Plain `new Date(x).toLocaleDateString()` uses the viewer's local
 * timezone, which can shift the displayed day by ±1 depending on where the
 * viewer is. Forcing timeZone: "UTC" keeps the same calendar date everywhere.
 */
export function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { timeZone: "UTC" });
}
