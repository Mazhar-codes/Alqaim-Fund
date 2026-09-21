/** The 4 donation purposes a donor can pick from — single choice, saved on Donation.purpose. */
export const DONATION_PURPOSES = [
  { value: "SADQA", labelEn: "Sadqa", labelUr: "صدقہ" },
  { value: "KHUMS", labelEn: "Khums", labelUr: "خمس" },
  { value: "GENERAL_FUND", labelEn: "General Fund", labelUr: "عمومی فنڈ" },
  { value: "YOUM_E_INHADAM_E_JANNAT_UL_BAQI", labelEn: "Youm-e-Inhadam-e-Jannat-ul-Baqi", labelUr: "یوم انہدام جنت البقیع" },
];

export function donationPurposeLabel(purpose, lang = "en") {
  const found = DONATION_PURPOSES.find((p) => p.value === purpose);
  if (!found) return purpose;
  return lang === "ur" ? found.labelUr : found.labelEn;
}
