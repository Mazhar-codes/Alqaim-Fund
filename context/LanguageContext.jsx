"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { translations } from "@/lib/translations";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("lang") : null;
    if (saved === "ur" || saved === "en") setLangState(saved);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "ur" ? "ur" : "en";
    document.documentElement.dir = lang === "ur" ? "rtl" : "ltr";
  }, [lang]);

  function setLang(next) {
    setLangState(next);
    try {
      localStorage.setItem("lang", next);
    } catch {
      // Storage may be unavailable (private mode etc.) — language just won't persist.
    }
  }

  function t(path) {
    const value = path.split(".").reduce((acc, key) => acc?.[key], translations[lang]);
    return value ?? path;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir: lang === "ur" ? "rtl" : "ltr" }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
