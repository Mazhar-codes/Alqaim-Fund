"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { MinusCircle, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function ChargesContent() {
  const { authedFetch } = useAuth();
  const [charges, setCharges] = useState(null);

  useEffect(() => {
    authedFetch("/api/admin/charges").then((d) => setCharges(d.charges || []));
  }, [authedFetch]);

  const total = charges?.reduce((sum, c) => sum + Number(c.amount), 0) ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <MinusCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Charges</h1>
          <p className="text-sm text-gray-500">
            {charges === null ? "Loading…" : `${charges.length} charge(s) deducted, Rs. ${total.toLocaleString()} total`}
          </p>
        </div>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-gray-500">
        Manual deductions from a member's accumulated balance — these never affect the member's actual installment
        progress or totals. To deduct a new charge, go to that member's page and use "Deduct Charge".
      </p>

      <Reveal className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Member</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {charges === null && (
              <tr>
                <td colSpan={4} className="p-4">
                  <div className="skeleton h-24 rounded-lg" />
                </td>
              </tr>
            )}
            {charges?.map((c) => (
              <tr key={c.id} className="border-t transition-colors hover:bg-gray-50">
                <td className="px-4 py-2">{formatDate(c.createdAt)}</td>
                <td className="px-4 py-2">
                  <Link href={`/admin/members/${c.userId}`} className="text-brand-700 hover:underline">
                    {c.user.memberId} — {c.user.name}
                  </Link>
                </td>
                <td className="px-4 py-2 font-medium text-amber-700">Rs. {Number(c.amount).toLocaleString()}</td>
                <td className="px-4 py-2">{c.reason || "—"}</td>
              </tr>
            ))}
            {charges?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8" />
                    No charges deducted yet
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Reveal>
    </main>
  );
}

export default function AdminCharges() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <ChargesContent />
    </ProtectedRoute>
  );
}
