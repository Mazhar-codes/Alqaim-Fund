"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, FileText, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";

function LoanQueueContent() {
  const { authedFetch } = useAuth();
  const [loans, setLoans] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null); // { loan, action }
  const [adminNote, setAdminNote] = useState("");
  const [tenureMonths, setTenureMonths] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    authedFetch("/api/admin/loans?status=PENDING").then((d) => setLoans(d.loans || []));
  }

  useEffect(load, [authedFetch]);

  function openDialog(loan, action) {
    setAdminNote("");
    setTenureMonths("");
    setError("");
    setDialog({ loan, action });
  }

  async function confirmDecision() {
    if (!dialog) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await authedFetch("/api/admin/loans", {
        method: "PATCH",
        body: JSON.stringify({
          loanId: dialog.loan.id,
          action: dialog.action,
          adminNote: adminNote || (dialog.action === "reject" ? "Rejected by admin" : null),
          tenureMonths: dialog.action === "approve" && tenureMonths ? Number(tenureMonths) : undefined,
        }),
      });
      setMessage(
        dialog.action === "approve" ? "Loan approved — funds released and repayment scheduled." : "Loan rejected."
      );
      setDialog(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Loan / Emergency Fund Requests</h1>
      <p className="mt-1 text-sm text-gray-600">
        Every request here claims a genuine emergency (death, accident, medical). Review the reason,
        description and supporting document before releasing any funds.
      </p>

      {message && <p className="mt-4 animate-fade-in-up text-sm text-green-700">{message}</p>}
      {error && !dialog && <p className="mt-4 animate-fade-in-up text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {loans === null &&
          [0, 1].map((i) => <div key={i} className="skeleton h-40 rounded-xl" />)}

        {loans?.map((l, i) => (
          <Reveal key={l.id} delay={i * 80} className="rounded-xl border bg-white p-5 transition-shadow hover:shadow-md">
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
                  <a
                    href={l.proofUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-brand-700 hover:underline"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    View supporting document
                  </a>
                </p>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => openDialog(l, "approve")}>
                Approve & Release Funds
              </Button>
              <Button variant="danger" size="sm" icon={XCircle} onClick={() => openDialog(l, "reject")}>
                Reject
              </Button>
            </div>
          </Reveal>
        ))}

        {loans?.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12 text-gray-400">
            <Inbox className="h-8 w-8" />
            No pending requests.
          </div>
        )}
      </div>

      <Modal
        open={!!dialog}
        onClose={() => !submitting && setDialog(null)}
        title={dialog?.action === "approve" ? "Approve & release funds" : "Reject request"}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDialog(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant={dialog?.action === "approve" ? "success" : "danger"}
              size="sm"
              loading={submitting}
              onClick={confirmDecision}
            >
              {dialog?.action === "approve" ? "Confirm Approval" : "Confirm Rejection"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              {dialog?.action === "approve" ? "Admin note (optional)" : "Reason for rejection"}
            </label>
            <textarea
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={dialog?.action === "approve" ? "e.g. Verified hospital receipt" : "e.g. Insufficient documentation"}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          {dialog?.action === "approve" && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Repay over how many upcoming installments? (blank = auto)
              </label>
              <input
                type="number"
                min={1}
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                placeholder="Auto"
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
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
