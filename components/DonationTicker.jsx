"use client";

import { useEffect, useState } from "react";
import { HeartHandshake } from "lucide-react";
import { donationPurposeLabel } from "@/lib/donationPurposes";
import { useLanguage } from "@/context/LanguageContext";

/** Slim banner that scrolls recent approved donations right-to-left, commerce-ticker style. */
export default function DonationTicker() {
  const { lang, t } = useLanguage();
  const [donations, setDonations] = useState([]);

  useEffect(() => {
    fetch("/api/donations")
      .then((r) => r.json())
      .then((d) => setDonations(d.donations || []))
      .catch(() => setDonations([]));
  }, []);

  const items =
    donations.length > 0
      ? donations.map(
          (d) => `${d.donorName} ${t("donate.tickerDonated")} Rs. ${Number(d.amount).toLocaleString()} ${t("donate.tickerFor")} ${donationPurposeLabel(d.purpose, lang)}`
        )
      : [t("donate.tickerFallback")];

  // Duplicated once so the 0% -> -50% translateX loop is seamless.
  const track = [...items, ...items];

  return (
    <div dir="ltr" className="overflow-hidden border-b border-brand-800 bg-gradient-to-r from-brand-800 to-brand-900 py-2">
      <div className="flex w-max animate-marquee items-center gap-10 whitespace-nowrap">
        {track.map((text, i) => (
          <span key={i} className="flex items-center gap-2 px-4 text-sm font-medium text-white">
            <HeartHandshake className="h-4 w-4 flex-shrink-0 text-accent-400" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
