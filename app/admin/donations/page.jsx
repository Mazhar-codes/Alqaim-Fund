"use client";

import { useEffect, useState } from "react";
import { Gift, ExternalLink, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function DonationsContent() {
  const { authedFetch } = useAuth();
  const [donations, setDonations] = useState(null);

  useEffect(() => {
    authedFetch("/api/admin/donations").then((d) => setDonations(d.donations || []));
  }, [authedFetch]);

  const total = donations?.reduce((sum, d) => sum + Number(d.amount), 0) ?? 0;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
          <Gift className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
          <p className="text-sm text-gray-500">
            {donations === null ? "Loading…" : `${donations.length} donation(s), Rs. ${total.toLocaleString()} total`}
          </p>
        </div>
      </div>

      <Reveal className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Donor Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Proof</th>
            </tr>
          </thead>
          <tbody>
            {donations === null && (
              <tr>
                <td colSpan={6} className="p-4">
                  <div className="skeleton h-24 rounded-lg" />
                </td>
              </tr>
            )}
            {donations?.map((d) => (
              <tr key={d.id} className="border-t transition-colors hover:bg-gray-50">
                <td className="px-4 py-2">{formatDate(d.createdAt)}</td>
                <td className="px-4 py-2">{d.donorName}</td>
                <td className="px-4 py-2">{d.donorPhone}</td>
                <td className="px-4 py-2 font-medium text-green-700">Rs. {Number(d.amount).toLocaleString()}</td>
                <td className="px-4 py-2">{d.transactionId || "—"}</td>
                <td className="px-4 py-2">
                  {d.proofUrl ? (
                    <a href={d.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {donations?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8" />
                    No donations yet
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

export default function AdminDonations() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <DonationsContent />
    </ProtectedRoute>
  );
}
