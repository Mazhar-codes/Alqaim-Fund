"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

function OverviewContent() {
  const { authedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, [authedFetch]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!stats) return <p className="p-6 text-gray-500">Loading…</p>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Admin Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total Members" value={stats.totalMembers} sub={`${stats.suspendedMembers} suspended`} />
        <Card label="Collection This Month" value={`Rs. ${stats.collectionThisMonth.toLocaleString()}`} />
        <Card
          label="Active Emergency Loans"
          value={stats.activeLoans}
          sub={`Rs. ${stats.loanOutstanding.toLocaleString()} outstanding`}
        />
        <Card label="Pending Verifications" value={stats.pendingVerifications} sub="payments + loan requests" />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <QuickLink
          href="/admin/payments"
          title="Payment Verification Queue"
          desc={`${stats.pendingPaymentVerifications} screenshot(s) waiting for review`}
        />
        <QuickLink
          href="/admin/loans"
          title="Loan / Emergency Fund Queue"
          desc={`${stats.pendingLoanRequests} request(s) waiting for approval`}
        />
        <QuickLink href="/admin/members" title="Member Management" desc="Search, edit, suspend, view full ledger" />
        <QuickLink href="/admin/reports" title="Reports" desc="Collection, defaulters, loan reports — export to Excel" />
      </div>
    </main>
  );
}

function Card({ label, value, sub }) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </div>
  );
}

function QuickLink({ href, title, desc }) {
  return (
    <Link href={href} className="rounded-xl border bg-white p-5 hover:border-brand-400 hover:shadow-sm">
      <p className="font-semibold text-brand-700">{title}</p>
      <p className="mt-1 text-sm text-gray-500">{desc}</p>
    </Link>
  );
}

export default function AdminOverview() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <OverviewContent />
    </ProtectedRoute>
  );
}
