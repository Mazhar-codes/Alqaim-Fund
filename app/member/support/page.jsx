"use client";

import { useState } from "react";
import { LifeBuoy, Smartphone, Landmark, Copy, Check, FileText, MessageCircle, Phone } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import TermsContent from "@/components/TermsContent";
import { useLanguage } from "@/context/LanguageContext";

const SUPPORT_PHONE_DISPLAY = "+92 307 5941906";
const SUPPORT_WHATSAPP = "923075941906";
const SUPPORT_TEL = "+923075941906";
const JAZZCASH_PHONE = "0313-5448309";
const IBAN = "PK88BAHL5798008100010601";

function SupportContent() {
  const { t } = useLanguage();
  const [ibanCopied, setIbanCopied] = useState(false);

  function copyIban() {
    navigator.clipboard
      .writeText(IBAN)
      .then(() => {
        setIbanCopied(true);
        setTimeout(() => setIbanCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <LifeBuoy className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">{t("support.pageTitle")}</h1>
      </div>

      <Reveal className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
          <Smartphone className="h-4 w-4 text-brand-600" />
          {t("support.paymentDetailsTitle")}
        </h2>

        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-gray-900">
            <Smartphone className="h-4 w-4 text-brand-600" />
            {t("donate.jazzcashTitle")}
          </p>
          <p className="mt-1 text-gray-600">{t("donate.accountName")}</p>
          <p dir="ltr" className="text-left font-mono text-gray-900">
            {JAZZCASH_PHONE}
          </p>
        </div>

        <div className="mt-4 rounded-xl border bg-gray-50 p-4">
          <p className="flex items-center gap-1.5 font-semibold text-gray-900">
            <Landmark className="h-4 w-4 text-brand-600" />
            {t("donate.bankTitle")}
          </p>
          <p className="mt-2 text-gray-600">
            {t("donate.accountNameLabel")}: <span className="font-medium text-gray-900">{t("donate.accountName")}</span>
          </p>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="text-gray-600">
              {t("donate.ibanLabel")}: <span dir="ltr" className="font-mono font-medium text-gray-900">{IBAN}</span>
            </p>
            <button
              type="button"
              onClick={copyIban}
              className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
            >
              {ibanCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              {ibanCopied ? t("donate.copied") : t("donate.copyIban")}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}`}
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition hover:bg-green-700"
          >
            <MessageCircle className="h-4 w-4" />
            {t("support.whatsapp")} <span dir="ltr">{SUPPORT_PHONE_DISPLAY}</span>
          </a>
          <a
            href={`tel:${SUPPORT_TEL}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
          >
            <Phone className="h-4 w-4" />
            {t("support.call")}
          </a>
        </div>
      </Reveal>

      <Reveal delay={100} className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
          <FileText className="h-4 w-4 text-brand-600" />
          {t("support.termsTitle")}
        </h2>
        <div className="mt-4">
          <TermsContent />
        </div>
      </Reveal>
    </main>
  );
}

export default function MemberSupport() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <SupportContent />
    </ProtectedRoute>
  );
}
