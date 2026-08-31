"use client";

import { useState } from "react";
import { MessageCircle, Phone, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const PHONE_DISPLAY = "+92 313 5448309";
const PHONE_WHATSAPP = "923135448309"; // wa.me format: country code, no + or spaces
const PHONE_TEL = "+923135448309";

/** Global floating support widget — WhatsApp + call, visible on every page. */
export default function SupportButton() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-64 animate-scale-in rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-2xl" dir="ltr">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-gray-900">{t("support.needHelp")}</p>
            <button onClick={() => setOpen(false)} className="rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-sm text-gray-500">{t("support.contactSupport")}</p>
          <p className="mt-2 font-mono text-sm text-gray-700">{PHONE_DISPLAY}</p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href={`https://wa.me/${PHONE_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-medium text-white transition hover:bg-green-700"
            >
              <MessageCircle className="h-4 w-4" />
              {t("support.whatsapp")}
            </a>
            <a
              href={`tel:${PHONE_TEL}`}
              className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Phone className="h-4 w-4" />
              {t("support.call")}
            </a>
          </div>
        </div>
      )}

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Contact support"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-xl transition-transform hover:scale-105 hover:bg-green-700"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>
    </div>
  );
}
