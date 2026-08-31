"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  HeartHandshake,
  Eye,
  Wallet,
  FileCheck2,
  Banknote,
  Sparkles,
  MessageCircle,
  Phone,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";
import TiltCard from "@/components/TiltCard";
import { useLanguage } from "@/context/LanguageContext";

const SUPPORT_PHONE_DISPLAY = "+92 313 5448309";
const SUPPORT_WHATSAPP = "923135448309";
const SUPPORT_TEL = "+923135448309";

export default function Landing() {
  const { t } = useLanguage();
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []));
  }, []);

  const STEPS = [
    { icon: Wallet, title: t("landing.step1Title"), body: t("landing.step1Body") },
    { icon: FileCheck2, title: t("landing.step2Title"), body: t("landing.step2Body") },
    { icon: Banknote, title: t("landing.step3Title"), body: t("landing.step3Body") },
  ];

  const FEATURES = [
    { icon: Banknote, title: t("landing.feature1Title"), body: t("landing.feature1Body") },
    { icon: HeartHandshake, title: t("landing.feature2Title"), body: t("landing.feature2Body") },
    { icon: Eye, title: t("landing.feature3Title"), body: t("landing.feature3Body") },
  ];

  return (
    <>
      <Navbar variant="public" />

      <main className="overflow-x-hidden">
        {/* Hero */}
        <section className="relative isolate px-4 pb-20 pt-16 sm:px-6 sm:pt-24">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-brand-300/30 blur-3xl animate-blob" />
            <div className="absolute top-10 right-1/4 h-72 w-72 rounded-full bg-accent-400/20 blur-3xl animate-blob animation-delay-2000" />
            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-purple-300/20 blur-3xl animate-blob animation-delay-4000" />
          </div>

          {/* Decorative floating 3D badges — purely visual, hidden on small screens to avoid clutter */}
          <div
            className="pointer-events-none absolute left-[6%] top-28 hidden animate-float items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur lg:flex"
            style={{ "--float-rot": "-6deg" }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 text-green-600">
              <ShieldCheck className="h-4.5 w-4.5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-gray-400">{t("landing.badge1Title")}</p>
              <p className="text-sm font-semibold text-gray-800">{t("landing.badge1Body")}</p>
            </div>
          </div>
          <div
            className="pointer-events-none absolute right-[6%] bottom-8 hidden animate-float items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur lg:flex"
            style={{ "--float-rot": "5deg", animationDelay: "1.2s" }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
              <HeartHandshake className="h-4.5 w-4.5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-gray-400">{t("landing.badge2Title")}</p>
              <p className="text-sm font-semibold text-gray-800">{t("landing.badge2Body")}</p>
            </div>
          </div>
          <div
            className="pointer-events-none absolute left-[12%] bottom-4 hidden animate-float items-center gap-2 rounded-2xl border border-gray-200/80 bg-white/90 px-4 py-3 shadow-xl backdrop-blur lg:flex"
            style={{ "--float-rot": "-4deg", animationDelay: "2.4s" }}
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
              <Wallet className="h-4.5 w-4.5" />
            </span>
            <div className="text-left">
              <p className="text-xs text-gray-400">{t("landing.badge3Title")}</p>
              <p className="text-sm font-semibold text-gray-800">{t("landing.badge3Body")}</p>
            </div>
          </div>

          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              {t("landing.badge")}
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
              {t("landing.titlePre")}
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                {t("landing.titleHighlight")}
              </span>
              {t("landing.titlePost")}
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">{t("landing.subtitle")}</p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="#plans"
                className="group flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-md shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg"
              >
                {t("landing.viewPlans")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:rotate-180" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md"
              >
                {t("landing.memberLogin")}
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("landing.howItWorks")}</h2>
            <p className="mt-2 text-gray-500">{t("landing.howItWorksSub")}</p>
          </Reveal>

          <div className="relative mt-12 grid gap-8 sm:grid-cols-3">
            <div className="absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent sm:block" />
            {STEPS.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 120} className="relative text-center">
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-gray-100">
                  <Icon className="h-7 w-7 text-brand-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section id="plans" className="bg-gray-50/80 px-4 py-20 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{t("landing.choosePlan")}</h2>
            <p className="mt-2 text-gray-500">{t("landing.choosePlanSub")}</p>
          </Reveal>

          <div className="mx-auto mt-10 grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan, i) => (
              <Reveal key={plan.id} delay={i * 100}>
                <PlanCard plan={plan} featured={i === 1} />
              </Reveal>
            ))}
            {plans.length === 0 &&
              [0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-96 rounded-2xl" />
              ))}
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }, i) => (
              <Reveal key={title} delay={i * 120}>
                <TiltCard max={6}>
                  <div className="group h-full rounded-2xl border border-gray-200 bg-white p-6 transition-shadow duration-300 hover:border-brand-200 hover:shadow-lg">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
                  </div>
                </TiltCard>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal as="section" className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 to-brand-900 px-8 py-14 text-center shadow-xl">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-accent-400/20 blur-2xl" />
            <ShieldCheck className="mx-auto h-10 w-10 text-white/90" />
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">{t("landing.ctaTitle")}</h2>
            <p className="mx-auto mt-2 max-w-md text-brand-100">{t("landing.ctaSub")}</p>
            <Link
              href="#plans"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              {t("landing.ctaButton")}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          </div>
        </Reveal>

        <footer className="border-t border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-500 sm:px-6">
          <p>
            © {new Date().getFullYear()} Alqaim Fund. {t("landing.footer")}
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2 sm:flex-row sm:gap-4">
            <span className="font-medium text-gray-600">{t("support.contactSupport")}:</span>
            <a
              href={`https://wa.me/${SUPPORT_WHATSAPP}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-green-700 hover:underline"
            >
              <MessageCircle className="h-4 w-4" />
              <span dir="ltr">{SUPPORT_PHONE_DISPLAY}</span>
            </a>
            <a href={`tel:${SUPPORT_TEL}`} className="inline-flex items-center gap-1.5 text-brand-700 hover:underline">
              <Phone className="h-4 w-4" />
              {t("support.call")}
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}
