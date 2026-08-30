"use client";

import Link from "next/link";
import { Check, ArrowRight, ShieldCheck } from "lucide-react";

export default function PlanCard({ plan, featured = false }) {
  const maxLoan = Number(plan.monthlyAmount) * plan.maxLoanMultiplier;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1.5 ${
        featured
          ? "border-brand-300 bg-gradient-to-b from-brand-50 to-white shadow-lg shadow-brand-100 hover:shadow-xl hover:shadow-brand-200"
          : "border-gray-200 bg-white shadow-sm hover:border-brand-200 hover:shadow-lg"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
          Most Popular
        </span>
      )}

      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
      </div>

      <p className="mt-4 text-3xl font-extrabold tracking-tight text-gray-900">
        Rs. {Number(plan.monthlyAmount).toLocaleString()}
        <span className="text-sm font-normal text-gray-500"> /month</span>
      </p>

      <ul className="mt-5 flex-1 space-y-3 text-sm text-gray-600">
        {[
          `Tenure: ${plan.tenureMonths} months`,
          `Max emergency loan: Rs. ${maxLoan.toLocaleString()}`,
          "No interest — ever",
          "Eligible after 3 paid installments",
        ].map((item) => (
          <li key={item} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-accent-600" />
            {item}
          </li>
        ))}
      </ul>

      <Link
        href={`/register?plan=${plan.id}`}
        className={`mt-6 flex items-center justify-center gap-2 rounded-lg py-2.5 text-center font-medium transition-all duration-150 hover:-translate-y-0.5 ${
          featured
            ? "bg-brand-600 text-white shadow-sm hover:bg-brand-700 hover:shadow-md"
            : "bg-gray-900 text-white hover:bg-gray-800"
        }`}
      >
        Join Now
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
