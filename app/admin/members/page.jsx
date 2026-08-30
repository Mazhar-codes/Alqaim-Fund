"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users, ArrowUpRight, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import { useAuth } from "@/context/AuthContext";

function MembersContent() {
  const { authedFetch } = useAuth();
  const [members, setMembers] = useState(null);
  const [q, setQ] = useState("");

  function load(query = "") {
    authedFetch(`/api/admin/members${query ? `?q=${encodeURIComponent(query)}` : ""}`).then((d) =>
      setMembers(d.members || [])
    );
  }

  useEffect(() => load(), [authedFetch]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Users className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Member Management</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mt-4 flex gap-2"
      >
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by Member ID, name, CNIC or phone"
            className="w-full rounded-lg border-gray-300 pl-9 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2"></th>
              <th className="px-4 py-2">Member ID</th>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Plan</th>
              <th className="px-4 py-2">Paid Installments</th>
              <th className="px-4 py-2">Total Paid</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {members === null && (
              <tr>
                <td colSpan={8} className="p-4">
                  <div className="skeleton h-32 rounded-lg" />
                </td>
              </tr>
            )}
            {members?.map((m) => (
              <tr key={m.id} className="border-t transition-colors hover:bg-gray-50">
                <td className="px-4 py-2">
                  {m.photoUrl ? (
                    <img src={m.photoUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700">
                      {m.name?.[0]?.toUpperCase() || "?"}
                    </div>
                  )}
                </td>
                <td className="px-4 py-2 font-mono">{m.memberId}</td>
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2">{m.plan.name}</td>
                <td className="px-4 py-2">{m.paidInstallments}</td>
                <td className="px-4 py-2">Rs. {Number(m.totalPaid).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/members/${m.id}`}
                    className="inline-flex items-center gap-1 font-medium text-brand-700 hover:underline"
                  >
                    View Ledger
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
            {members?.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-6 w-6" />
                    No members found
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function AdminMembers() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <MembersContent />
    </ProtectedRoute>
  );
}
