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
      {/*
       * The two halves of `track` must be pixel-identical for the 0% -> -50%
       * translateX loop to be seamless. Spacing is done with a fixed
       * margin-right on every item (not a flex `gap` on the parent) so each
       * item's own box already includes its trailing space — that keeps the
       * midpoint of the doubled track exactly at the start of the second
       * half. A parent `gap` would add one extra gap only between the two
       * halves, shifting that boundary by half a gap and causing a visible
       * jump/snap right at the loop point.
       */}
      <div className="flex w-max animate-marquee items-center whitespace-nowrap">
        {track.map((text, i) => (
          <span key={i} className="mr-10 flex flex-shrink-0 items-center gap-2 text-sm font-medium text-white">
            <HeartHandshake className="h-4 w-4 flex-shrink-0 text-accent-400" />
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
