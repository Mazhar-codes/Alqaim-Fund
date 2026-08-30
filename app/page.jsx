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
} from "lucide-react";
import Navbar from "@/components/Navbar";
import PlanCard from "@/components/PlanCard";
import Reveal from "@/components/Reveal";

const STEPS = [
  {
    icon: Wallet,
    title: "1. Join a plan",
    body: "Pick Plan A, B, or C and pay a fixed monthly installment — no hidden fees, no surprises.",
  },
  {
    icon: FileCheck2,
    title: "2. Build eligibility",
    body: "After 3 paid installments you're eligible to request emergency support if you ever need it.",
  },
  {
    icon: Banknote,
    title: "3. Get help, interest-free",
    body: "A genuine emergency, admin-approved, and funds are released — repaid with zero interest.",
  },
];

const FEATURES = [
  {
    icon: Banknote,
    title: "No Interest",
    body: "Borrow Rs. 100,000, return exactly Rs. 100,000. Always.",
  },
  {
    icon: HeartHandshake,
    title: "Emergency Support",
    body: "Loans are for genuine emergencies only — accident, death, medical crisis — admin-verified before funds move.",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    body: "Every rupee in and out is logged in your personal transaction ledger.",
  },
];

export default function Landing() {
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => setPlans(d.plans || []));
  }, []);

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

          <div className="mx-auto max-w-4xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-medium text-brand-700 shadow-sm backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              A committee fund built on trust
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-6xl">
              Save together.{" "}
              <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">
                Support each other
              </span>{" "}
              when it matters most.
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-600">
              Save monthly with your community. When a genuine emergency hits — accident,
              death in the family, hospitalization — apply for an interest-free loan,
              approved by an admin, funds released fast.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="#plans"
                className="group flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 font-medium text-white shadow-md shadow-brand-200 transition-all hover:-translate-y-0.5 hover:bg-brand-700 hover:shadow-lg"
              >
                View Plans
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-6 py-3 font-medium text-gray-700 transition-all hover:-translate-y-0.5 hover:border-gray-400 hover:shadow-md"
              >
                Member Login
              </Link>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <Reveal className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">How It Works</h2>
            <p className="mt-2 text-gray-500">Three simple steps from joining to getting support.</p>
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
            <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">Choose Your Plan</h2>
            <p className="mt-2 text-gray-500">Fixed monthly installments. Pick what fits your budget.</p>
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
              <Reveal
                key={title}
                delay={i * 120}
                className="group rounded-2xl border border-gray-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-gray-900">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{body}</p>
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
            <h2 className="mt-4 text-2xl font-bold text-white sm:text-3xl">Ready to join the committee?</h2>
            <p className="mx-auto mt-2 max-w-md text-brand-100">
              Registration takes less than two minutes. Your Member ID is generated instantly.
            </p>
            <Link
              href="#plans"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 font-semibold text-brand-700 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <footer className="border-t border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500 sm:px-6">
          © {new Date().getFullYear()} Alqaim Fund. Built on trust, transparency, and community.
        </footer>
      </main>
    </>
  );
}
