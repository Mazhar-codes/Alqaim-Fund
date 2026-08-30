"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

function LoanQueueContent() {
  const { authedFetch } = useAuth();
  const [loans, setLoans] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    authedFetch("/api/admin/loans?status=PENDING").then((d) => setLoans(d.loans || []));
  }

  useEffect(load, [authedFetch]);

  async function decide(loanId, action) {
    setError("");
    setMessage("");
    try {
      let adminNote;
      let tenureMonths;
      if (action === "reject") {
        adminNote = window.prompt("Reason for rejection?") || "Rejected by admin";
      } else {
        adminNote = window.prompt("Admin note (optional)") || null;
        const t = window.prompt("Repay over how many upcoming installments? (blank = auto)");
        tenureMonths = t ? Number(t) : undefined;
      }
      await authedFetch("/api/admin/loans", {
        method: "PATCH",
        body: JSON.stringify({ loanId, action, adminNote, tenureMonths }),
      });
      setMessage(action === "approve" ? "Loan approved — funds released and repayment scheduled." : "Loan rejected.");
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Loan / Emergency Fund Requests</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every request here claims a genuine emergency (death, accident, medical). Review the reason,
        description and supporting document before releasing any funds.
      </p>

      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {loans.map((l) => (
          <div key={l.id} className="rounded-xl border bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {l.user.memberId} — {l.user.name} <span className="text-gray-400">({l.user.phone})</span>
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Paid installments so far: {l.user.paidInstallments}
                </p>
              </div>
              <StatusBadge status={l.status} />
            </div>

            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <p><span className="text-gray-500">Reason:</span> {l.reasonCategory.replaceAll("_", " ")}</p>
              <p><span className="text-gray-500">Amount:</span> Rs. {Number(l.amount).toLocaleString()}</p>
              <p className="sm:col-span-2"><span className="text-gray-500">Description:</span> {l.description}</p>
              {l.proofUrl && (
                <p className="sm:col-span-2">
                  <a href={l.proofUrl} target="_blank" rel="noreferrer" className="text-brand-700 hover:underline">
                    View supporting document
                  </a>
                </p>
              )}
            </div>

            <div className="mt-4 space-x-2">
              <button onClick={() => decide(l.id, "approve")} className="rounded bg-green-600 px-4 py-1.5 text-white hover:bg-green-700">
                Approve & Release Funds
              </button>
              <button onClick={() => decide(l.id, "reject")} className="rounded bg-red-600 px-4 py-1.5 text-white hover:bg-red-700">
                Reject
              </button>
            </div>
          </div>
        ))}
        {loans.length === 0 && <p className="text-gray-400">No pending requests.</p>}
      </div>
    </main>
  );
}

export default function AdminLoans() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <LoanQueueContent />
    </ProtectedRoute>
  );
}
