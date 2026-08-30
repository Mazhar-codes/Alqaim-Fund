"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

function PaymentsQueueContent() {
  const { authedFetch } = useAuth();
  const [payments, setPayments] = useState([]);
  const [manual, setManual] = useState({ memberId: "", amount: "", paymentDate: "", transactionId: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    authedFetch("/api/admin/payments?status=PENDING").then((d) => setPayments(d.payments || []));
  }

  useEffect(load, [authedFetch]);

  async function decide(paymentId, action) {
    setError("");
    setMessage("");
    try {
      let rejectReason;
      if (action === "reject") {
        rejectReason = window.prompt("Reason for rejection?") || "Rejected by admin";
      }
      await authedFetch("/api/admin/payments", {
        method: "PATCH",
        body: JSON.stringify({ paymentId, action, rejectReason }),
      });
      setMessage(`Payment ${action}d.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function addManual(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      await authedFetch("/api/admin/payments", { method: "POST", body: JSON.stringify(manual) });
      setMessage("Manual payment recorded.");
      setManual({ memberId: "", amount: "", paymentDate: "", transactionId: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Payment Verification Queue</h1>

      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Member</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Proof</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{p.user.memberId} — {p.user.name}</td>
                <td className="px-4 py-2">Rs. {Number(p.amount).toLocaleString()}</td>
                <td className="px-4 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">{p.transactionId || "—"}</td>
                <td className="px-4 py-2">
                  {p.proofUrl ? (
                    <a href={p.proofUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                      View
                    </a>
                  ) : "—"}
                </td>
                <td className="px-4 py-2 space-x-2">
                  <button onClick={() => decide(p.id, "approve")} className="rounded bg-green-600 px-3 py-1 text-white hover:bg-green-700">
                    Approve
                  </button>
                  <button onClick={() => decide(p.id, "reject")} className="rounded bg-red-600 px-3 py-1 text-white hover:bg-red-700">
                    Reject
                  </button>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-gray-400">Nothing pending</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold">Add Payment Manually (cash)</h2>
      <form onSubmit={addManual} className="mt-3 grid gap-3 rounded-xl border bg-white p-5 sm:grid-cols-4">
        <input
          placeholder="Member ID (USR001)"
          required
          value={manual.memberId}
          onChange={(e) => setManual((f) => ({ ...f, memberId: e.target.value }))}
          className="rounded-lg border-gray-300 shadow-sm"
        />
        <input
          type="number"
          placeholder="Amount"
          required
          value={manual.amount}
          onChange={(e) => setManual((f) => ({ ...f, amount: e.target.value }))}
          className="rounded-lg border-gray-300 shadow-sm"
        />
        <input
          type="date"
          required
          value={manual.paymentDate}
          onChange={(e) => setManual((f) => ({ ...f, paymentDate: e.target.value }))}
          className="rounded-lg border-gray-300 shadow-sm"
        />
        <input
          placeholder="Transaction ID (optional)"
          value={manual.transactionId}
          onChange={(e) => setManual((f) => ({ ...f, transactionId: e.target.value }))}
          className="rounded-lg border-gray-300 shadow-sm"
        />
        <button className="sm:col-span-4 rounded-lg bg-brand-600 py-2 font-medium text-white hover:bg-brand-700">
          Record Payment
        </button>
      </form>
    </main>
  );
}

export default function AdminPayments() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <PaymentsQueueContent />
    </ProtectedRoute>
  );
}
