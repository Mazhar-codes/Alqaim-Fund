"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import PlanCard from "@/components/PlanCard";

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
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <section className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            A committee fund you can trust.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
            Save monthly with your community. When a genuine emergency hits — accident,
            death in the family, hospitalization — apply for an interest-free loan,
            approved by an admin, funds released fast.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="#plans" className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">
              View Plans
            </Link>
            <Link href="/login" className="rounded-lg border px-5 py-2.5 font-medium hover:bg-gray-50">
              Member Login
            </Link>
          </div>
        </section>

        <section id="plans" className="mt-16">
          <h2 className="text-center text-2xl font-bold">Choose Your Plan</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
          </div>
        </section>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            ["No Interest", "Borrow Rs. 100,000, return exactly Rs. 100,000. Always."],
            ["Emergency Support", "Loans are for genuine emergencies only — accident, death, medical crisis — admin-verified before funds move."],
            ["Full Transparency", "Every rupee in and out is logged in your personal transaction ledger."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-xl border bg-white p-5">
              <h3 className="font-semibold text-brand-700">{title}</h3>
              <p className="mt-2 text-sm text-gray-600">{body}</p>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
