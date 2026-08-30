"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
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
  if (!overview) return <p className="p-6 text-gray-500">Loading…</p>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-3">
        {overview.member.photoUrl ? (
          <img src={overview.member.photoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-lg font-semibold text-gray-400">
            {overview.member.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <h1 className="text-2xl font-bold">
          Welcome, {overview.member.name} <span className="text-gray-400">({overview.member.memberId})</span>
        </h1>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Plan" value={`${overview.plan.name} (Rs. ${Number(overview.plan.monthlyAmount).toLocaleString()}/mo)`} />
        <Stat label="Total Paid" value={`Rs. ${Number(overview.totalPaid).toLocaleString()}`} />
        <Stat label="Total Remaining" value={`Rs. ${Number(overview.totalRemaining).toLocaleString()}`} />
        <Stat label="Installments Paid" value={`${overview.paidInstallments} / ${overview.plan.tenureMonths}`} />
        <Stat
          label="Next Due Date"
          value={overview.nextDueDate ? formatDate(overview.nextDueDate) : "—"}
        />
      </div>

      {overview.activeLoan && (
        <div className="mt-6 rounded-xl border bg-amber-50 p-4">
          <p className="font-medium">
            Active Emergency Loan: Rs. {Number(overview.activeLoan.amount).toLocaleString()} — Repaid Rs.{" "}
            {Number(overview.activeLoan.totalRepaid).toLocaleString()}, Monthly Deduction Rs.{" "}
            {Number(overview.activeLoan.monthlyDeduction || 0).toLocaleString()}
          </p>
        </div>
      )}

      <h2 className="mt-10 text-lg font-semibold">Installment History</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
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
              <tr key={i.id} className="border-t">
                <td className="px-4 py-2">{i.installmentNumber}</td>
                <td className="px-4 py-2">{formatDate(i.dueDate)}</td>
                <td className="px-4 py-2">Rs. {Number(i.amount).toLocaleString()}</td>
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

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
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
