"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ExternalLink, Inbox, PlusCircle, AlertTriangle } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function amountsMismatch(amount, dueAmount) {
  return dueAmount != null && Math.abs(Number(amount) - Number(dueAmount)) > 0.01;
}

function PaymentsQueueContent() {
  const { authedFetch } = useAuth();
  const [payments, setPayments] = useState(null);
  const [manual, setManual] = useState({ memberId: "", amount: "", paymentDate: "", transactionId: "" });
  const [manualDue, setManualDue] = useState(null); // { name, dueAmount } for the member currently typed in
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);
  const [manualConfirmOpen, setManualConfirmOpen] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(null); // payment being rejected
  const [rejectReason, setRejectReason] = useState("");
  const [approveDialog, setApproveDialog] = useState(null); // mismatched payment awaiting confirm
  const [submitting, setSubmitting] = useState(false);

  function load() {
    authedFetch("/api/admin/payments?status=PENDING").then((d) => setPayments(d.payments || []));
  }

  useEffect(load, [authedFetch]);

  async function doApprove(paymentId) {
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await authedFetch("/api/admin/payments", { method: "PATCH", body: JSON.stringify({ paymentId, action: "approve" }) });
      setMessage("Payment approved.");
      setApproveDialog(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleApproveClick(payment) {
    if (amountsMismatch(payment.amount, payment.dueAmount)) {
      setError("");
      setApproveDialog(payment);
    } else {
      doApprove(payment.id);
    }
  }

  async function confirmReject() {
    if (!rejectDialog) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await authedFetch("/api/admin/payments", {
        method: "PATCH",
        body: JSON.stringify({ paymentId: rejectDialog.id, action: "reject", rejectReason: rejectReason || "Rejected by admin" }),
      });
      setMessage("Payment rejected.");
      setRejectDialog(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function checkManualDue(memberId) {
    if (!memberId.trim()) {
      setManualDue(null);
      return;
    }
    try {
      const d = await authedFetch(`/api/admin/payments?memberId=${encodeURIComponent(memberId.trim())}`);
      setManualDue(d);
    } catch {
      setManualDue(null);
    }
  }

  async function submitManual() {
    setError("");
    setMessage("");
    setManualSubmitting(true);
    try {
      await authedFetch("/api/admin/payments", { method: "POST", body: JSON.stringify(manual) });
      setMessage("Manual payment recorded.");
      setManual({ memberId: "", amount: "", paymentDate: "", transactionId: "" });
      setManualDue(null);
      setManualConfirmOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setManualSubmitting(false);
    }
  }

  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualDue && amountsMismatch(manual.amount, manualDue.dueAmount)) {
      setManualConfirmOpen(true);
    } else {
      submitManual();
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Payment Verification Queue</h1>

      {message && <p className="mt-4 animate-fade-in-up text-sm text-green-700">{message}</p>}
      {error && !rejectDialog && !approveDialog && <p className="mt-4 animate-fade-in-up text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Member</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Due</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Proof</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {payments === null && (
              <tr>
                <td colSpan={7} className="p-4">
                  <div className="skeleton h-24 rounded-lg" />
                </td>
              </tr>
            )}
            {payments?.map((p) => {
              const mismatch = amountsMismatch(p.amount, p.dueAmount);
              return (
                <tr key={p.id} className={`border-t transition-colors hover:bg-gray-50 ${mismatch ? "bg-amber-50/60" : ""}`}>
                  <td className="px-4 py-2">{p.user.memberId} — {p.user.name}</td>
                  <td className="px-4 py-2">Rs. {Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {p.dueAmount != null ? (
                      <span className={mismatch ? "inline-flex items-center gap-1 font-medium text-amber-700" : "text-gray-500"}>
                        {mismatch && <AlertTriangle className="h-3.5 w-3.5" />}
                        Rs. {Number(p.dueAmount).toLocaleString()}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-2">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-2">{p.transactionId || "—"}</td>
                  <td className="px-4 py-2">
                    {p.proofUrl ? (
                      <a href={p.proofUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
                        View <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-2">
                      <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => handleApproveClick(p)}>
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        icon={XCircle}
                        onClick={() => {
                          setRejectReason("");
                          setError("");
                          setRejectDialog(p);
                        }}
                      >
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {payments?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="h-8 w-8" />
                    Nothing pending
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Reveal>
        <h2 className="mt-10 flex items-center gap-2 text-lg font-semibold text-gray-900">
          <PlusCircle className="h-5 w-5 text-brand-600" />
          Add Payment Manually (cash)
        </h2>
        <form onSubmit={handleManualSubmit} className="mt-3 grid gap-3 rounded-xl border bg-white p-5 shadow-sm sm:grid-cols-4">
          <input
            placeholder="Member ID (USR001)"
            required
            value={manual.memberId}
            onChange={(e) => setManual((f) => ({ ...f, memberId: e.target.value }))}
            onBlur={(e) => checkManualDue(e.target.value)}
            className="rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <input
            type="number"
            placeholder="Amount"
            required
            value={manual.amount}
            onChange={(e) => setManual((f) => ({ ...f, amount: e.target.value }))}
            className="rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <input
            type="date"
            required
            value={manual.paymentDate}
            onChange={(e) => setManual((f) => ({ ...f, paymentDate: e.target.value }))}
            className="rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          <input
            placeholder="Transaction ID (optional)"
            value={manual.transactionId}
            onChange={(e) => setManual((f) => ({ ...f, transactionId: e.target.value }))}
            className="rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          {manualDue && (
            <p className="sm:col-span-4 text-sm text-gray-500">
              {manualDue.dueAmount != null
                ? `${manualDue.name} currently owes Rs. ${manualDue.dueAmount.toLocaleString()} for their next installment.`
                : `${manualDue.name} has no pending installments.`}
            </p>
          )}
          <Button type="submit" loading={manualSubmitting} className="sm:col-span-4">
            Record Payment
          </Button>
        </form>
      </Reveal>

      <Modal
        open={!!rejectDialog}
        onClose={() => !submitting && setRejectDialog(null)}
        title="Reject payment"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setRejectDialog(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" loading={submitting} onClick={confirmReject}>
              Confirm Rejection
            </Button>
          </>
        }
      >
        <label className="block text-sm font-medium text-gray-700">Reason for rejection</label>
        <textarea
          rows={3}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="e.g. Amount doesn't match, unclear screenshot"
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
        />
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Modal>

      <Modal
        open={!!approveDialog}
        onClose={() => !submitting && setApproveDialog(null)}
        title="Amount doesn't match what's due"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setApproveDialog(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="success" size="sm" loading={submitting} onClick={() => doApprove(approveDialog.id)}>
              Approve Anyway
            </Button>
          </>
        }
      >
        {approveDialog && (
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{approveDialog.user.name}</span> paid{" "}
            <span className="font-semibold">Rs. {Number(approveDialog.amount).toLocaleString()}</span>, but{" "}
            <span className="font-semibold">Rs. {Number(approveDialog.dueAmount).toLocaleString()}</span> is due for their
            next installment. Approving will still mark that installment as fully paid, and the shortfall (or excess) won't
            be automatically collected elsewhere. Only proceed if this is intentional.
          </p>
        )}
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Modal>

      <Modal
        open={manualConfirmOpen}
        onClose={() => !manualSubmitting && setManualConfirmOpen(false)}
        title="Amount doesn't match what's due"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setManualConfirmOpen(false)} disabled={manualSubmitting}>
              Cancel
            </Button>
            <Button variant="success" size="sm" loading={manualSubmitting} onClick={submitManual}>
              Record Anyway
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          Recording <span className="font-semibold">Rs. {Number(manual.amount || 0).toLocaleString()}</span> for{" "}
          <span className="font-semibold text-gray-900">{manualDue?.name}</span>, but{" "}
          <span className="font-semibold">Rs. {Number(manualDue?.dueAmount || 0).toLocaleString()}</span> is due for their
          next installment. This will still mark that installment as fully paid. Only proceed if this is intentional.
        </p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </Modal>
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
