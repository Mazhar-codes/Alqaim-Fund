"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  Banknote,
  HeartHandshake,
  ClipboardCheck,
  ArrowUpRight,
  FileBarChart,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";

function OverviewContent() {
  const { authedFetch } = useAuth();
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch("/api/admin/stats").then(setStats).catch((e) => setError(e.message));
  }, [authedFetch]);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!stats) return <OverviewSkeleton />;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold animate-fade-in-up">Admin Overview</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card icon={Users} label="Total Members" value={stats.totalMembers} sub={`${stats.suspendedMembers} suspended`} />
        <Card
          icon={Banknote}
          label="Collection This Month"
          value={`Rs. ${stats.collectionThisMonth.toLocaleString()}`}
          accent="text-green-600"
        />
        <Card
          icon={HeartHandshake}
          label="Active Emergency Loans"
          value={stats.activeLoans}
          sub={`Rs. ${stats.loanOutstanding.toLocaleString()} outstanding`}
        />
        <Card
          icon={ClipboardCheck}
          label="Pending Verifications"
          value={stats.pendingVerifications}
          sub="payments + loan requests"
          accent={stats.pendingVerifications > 0 ? "text-amber-600" : "text-gray-900"}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <QuickLink
          icon={ClipboardCheck}
          href="/admin/payments"
          title="Payment Verification Queue"
          desc={`${stats.pendingPaymentVerifications} screenshot(s) waiting for review`}
        />
        <QuickLink
          icon={HeartHandshake}
          href="/admin/loans"
          title="Loan / Emergency Fund Queue"
          desc={`${stats.pendingLoanRequests} request(s) waiting for approval`}
        />
        <QuickLink icon={Users} href="/admin/members" title="Member Management" desc="Search, edit, suspend, view full ledger" />
        <QuickLink
          icon={FileBarChart}
          href="/admin/reports"
          title="Reports"
          desc="Collection, defaulters, loan reports — export to Excel"
        />
      </div>
    </main>
  );
}

function Card({ icon: Icon, label, value, sub, accent = "text-gray-900" }) {
  return (
    <Reveal className="group rounded-xl border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold ${accent}`}>{value}</p>
      {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
    </Reveal>
  );
}

function QuickLink({ icon: Icon, href, title, desc }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-3 rounded-xl border bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
    >
      <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        <Icon className="h-5 w-5" />
      </span>
      <div className="flex-1">
        <p className="flex items-center gap-1 font-semibold text-brand-700">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
        <p className="mt-1 text-sm text-gray-500">{desc}</p>
      </div>
    </Link>
  );
}

function OverviewSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="skeleton h-8 w-56 rounded-lg" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
    </main>
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
