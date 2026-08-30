"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

function MembersContent() {
  const { authedFetch } = useAuth();
  const [members, setMembers] = useState([]);
  const [q, setQ] = useState("");

  function load(query = "") {
    authedFetch(`/api/admin/members${query ? `?q=${encodeURIComponent(query)}` : ""}`).then((d) =>
      setMembers(d.members || [])
    );
  }

  useEffect(() => load(), [authedFetch]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Member Management</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          load(q);
        }}
        className="mt-4 flex gap-2"
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by Member ID, name, CNIC or phone"
          className="w-full max-w-md rounded-lg border-gray-300 shadow-sm"
        />
        <button className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700">
          Search
        </button>
      </form>

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
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
            {members.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="px-4 py-2 font-mono">{m.memberId}</td>
                <td className="px-4 py-2">{m.name}</td>
                <td className="px-4 py-2">{m.plan.name}</td>
                <td className="px-4 py-2">{m.paidInstallments}</td>
                <td className="px-4 py-2">Rs. {Number(m.totalPaid).toLocaleString()}</td>
                <td className="px-4 py-2"><StatusBadge status={m.status} /></td>
                <td className="px-4 py-2">
                  <Link href={`/admin/members/${m.id}`} className="text-brand-700 hover:underline">
                    View Ledger
                  </Link>
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-400">No members found</td>
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
