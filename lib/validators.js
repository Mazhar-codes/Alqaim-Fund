const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/;

export function isValidCnic(cnic) {
  return typeof cnic === "string" && CNIC_REGEX.test(cnic);
}

/** Auto-inserts dashes as the user types: 4210112345671 -> 42101-1234567-1 */
export function formatCnic(raw) {
  const digits = raw.replace(/\D/g, "").slice(0, 13);
  const part1 = digits.slice(0, 5);
  const part2 = digits.slice(5, 12);
  const part3 = digits.slice(12, 13);
  return [part1, part2, part3].filter(Boolean).join("-");
}

const GMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@gmail\.com$/;

/** Registration is restricted to Gmail addresses. */
export function isGmailAddress(email) {
  return typeof email === "string" && GMAIL_REGEX.test(email.trim().toLowerCase());
}

/** Converts a local Pakistani phone number (e.g. "0313-5448309") to wa.me's international format ("923135448309"). */
export function toWhatsAppNumber(phone) {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.startsWith("92")) return digits;
  return digits.replace(/^0/, "92");
}
