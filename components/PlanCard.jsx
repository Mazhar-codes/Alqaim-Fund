"use client";

import Link from "next/link";

export default function PlanCard({ plan }) {
  const maxLoan = Number(plan.monthlyAmount) * plan.maxLoanMultiplier;
  return (
    <div className="flex flex-col rounded-2xl border bg-white p-6 shadow-sm">
      <h3 className="text-xl font-bold text-brand-700">{plan.name}</h3>
      <p className="mt-1 text-3xl font-extrabold">
        Rs. {Number(plan.monthlyAmount).toLocaleString()} <span className="text-sm font-normal text-gray-500">/month</span>
      </p>
      <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
        <li>Tenure: {plan.tenureMonths} months</li>
        <li>Max emergency loan: Rs. {maxLoan.toLocaleString()}</li>
        <li>No interest — ever</li>
        <li>Eligible after 3 paid installments</li>
      </ul>
      <Link
        href={`/register?plan=${plan.id}`}
        className="mt-6 rounded-lg bg-brand-600 py-2 text-center font-medium text-white hover:bg-brand-700"
      >
        Join Now
      </Link>
    </div>
  );
}
