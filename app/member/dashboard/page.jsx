"use client";

import { useEffect, useState } from "react";
import {
  Wallet,
  PiggyBank,
  CalendarClock,
  ListChecks,
  HeartHandshake,
  AlertTriangle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function DashboardContent() {
  const { authedFetch } = useAuth();
  const [overview, setOverview] = useState(null);
  const [installments, setInstallments] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([authedFetch("/api/member/overview"), authedFetch("/api/member/installments")])
      .then(([o, i]) => {
        setOverview(o);
        setInstallments(i.installments || []);
      })
      .catch((e) => setError(e.message));
  }, [authedFetch]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!overview) return <DashboardSkeleton />;

  const progressPct = Math.round((overview.paidInstallments / overview.plan.tenureMonths) * 100);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3 animate-fade-in-up">
        {overview.member.photoUrl ? (
          <img src={overview.member.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-white shadow" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-lg font-semibold text-brand-700 shadow">
            {overview.member.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <h1 className="text-2xl font-bold">
          Welcome, {overview.member.name} <span className="text-gray-400">({overview.member.memberId})</span>
        </h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={Wallet} label="Plan" value={`${overview.plan.name}`} sub={`Rs. ${Number(overview.plan.monthlyAmount).toLocaleString()}/mo`} />
        <Stat icon={PiggyBank} label="Total Paid" value={`Rs. ${Number(overview.totalPaid).toLocaleString()}`} accent="text-green-600" />
        <Stat icon={Wallet} label="Total Remaining" value={`Rs. ${Number(overview.totalRemaining).toLocaleString()}`} />
        <Stat icon={ListChecks} label="Installments Paid" value={`${overview.paidInstallments} / ${overview.plan.tenureMonths}`} />
        <Stat
          icon={CalendarClock}
          label="Next Due Date"
          value={overview.nextDueDate ? formatDate(overview.nextDueDate) : "—"}
        />
      </div>

      <Reveal className="mt-6 rounded-xl border bg-white p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-gray-700">Cycle Progress</span>
          <span className="text-gray-500">{progressPct}%</span>
        </div>
        <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-500 to-accent-500 transition-all duration-700 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </Reveal>

      {overview.activeLoan && (
        <Reveal className="mt-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <HeartHandshake className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <p className="text-sm text-amber-900">
            <span className="font-semibold">Active Emergency Loan:</span> Rs.{" "}
            {Number(overview.activeLoan.amount).toLocaleString()} — Repaid Rs.{" "}
            {Number(overview.activeLoan.totalRepaid).toLocaleString()}, Monthly Deduction Rs.{" "}
            {Number(overview.activeLoan.monthlyDeduction || 0).toLocaleString()}
          </p>
        </Reveal>
      )}

      <h2 className="mt-10 text-lg font-semibold text-gray-900">Installment History</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">Due Date</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Loan Deduction</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Transaction ID</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((i) => (
              <tr key={i.id} className="border-t transition-colors hover:bg-gray-50">
                <td className="px-4 py-2">{i.installmentNumber}</td>
                <td className="px-4 py-2">{formatDate(i.dueDate)}</td>
                <td className="px-4 py-2">
                  Rs. {Number(i.amount).toLocaleString()}
                  {i.amountPaid != null && Number(i.amount) - Number(i.amountPaid) > 0.01 && (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="h-3 w-3" />
                      Only Rs. {Number(i.amountPaid).toLocaleString()} received
                    </span>
                  )}
                </td>
                <td className="px-4 py-2">
                  {Number(i.loanDeduction) > 0 ? `Rs. ${Number(i.loanDeduction).toLocaleString()}` : "—"}
                </td>
                <td className="px-4 py-2"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-2">{i.transactionId || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

function Stat({ icon: Icon, label, value, sub, accent = "text-gray-900" }) {
  return (
    <div className="group rounded-xl border bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`mt-2 text-lg font-semibold ${accent}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="skeleton h-8 w-64 rounded-lg" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 rounded-xl" />
        ))}
      </div>
      <div className="mt-10 skeleton h-64 rounded-xl" />
    </main>
  );
}

export default function MemberDashboard() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <DashboardContent />
    </ProtectedRoute>
  );
}
