"use client";

import { useEffect, useState } from "react";
import { Gift, ExternalLink, Inbox, CheckCircle2, XCircle, Download } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";
import { timestampedFilename } from "@/lib/exportFilename";
import { firebaseAuth } from "@/lib/firebaseClient";

function DonationsContent() {
  const { authedFetch } = useAuth();
  const [donations, setDonations] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(null); // donation being rejected
  const [rejectReason, setRejectReason] = useState("");

  function load() {
    authedFetch("/api/admin/donations").then((d) => setDonations(d.donations || []));
  }

  useEffect(load, [authedFetch]);

  const pending = donations?.filter((d) => d.status === "PENDING") ?? [];
  const total = donations?.filter((d) => d.status === "APPROVED").reduce((sum, d) => sum + Number(d.amount), 0) ?? 0;

  async function approve(donationId) {
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await authedFetch("/api/admin/donations", { method: "PATCH", body: JSON.stringify({ donationId, action: "approve" }) });
      setMessage("Donation approved.");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReject() {
    if (!rejectDialog) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      await authedFetch("/api/admin/donations", {
        method: "PATCH",
        body: JSON.stringify({ donationId: rejectDialog.id, action: "reject", rejectReason: rejectReason || "Rejected by admin" }),
      });
      setMessage("Donation rejected.");
      setRejectDialog(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function exportXlsx() {
    setExporting(true);
    try {
      const token = await firebaseAuth.currentUser.getIdToken();
      const res = await fetch("/api/admin/reports?type=donations&format=xlsx", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = timestampedFilename("donations-report");
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-pink-700">
            <Gift className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
            <p className="text-sm text-gray-500">
              {donations === null ? "Loading…" : `${donations.length} donation(s), Rs. ${total.toLocaleString()} approved total`}
            </p>
          </div>
        </div>
        <Button variant="dark" size="md" icon={Download} loading={exporting} onClick={exportXlsx}>
          Export to Excel
        </Button>
      </div>

      {message && <p className="mt-4 animate-fade-in-up text-sm text-green-700">{message}</p>}
      {error && !rejectDialog && <p className="mt-4 animate-fade-in-up text-sm text-red-600">{error}</p>}

      <h2 className="mt-8 text-lg font-semibold text-gray-900">Pending Verification</h2>
      <Reveal className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Donor Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Proof</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {donations === null && (
              <tr>
                <td colSpan={7} className="p-4">
                  <div className="skeleton h-24 rounded-lg" />
                </td>
              </tr>
            )}
            {pending.map((d) => (
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
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <Button variant="success" size="sm" icon={CheckCircle2} loading={submitting} onClick={() => approve(d.id)}>
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={XCircle}
                      onClick={() => {
                        setRejectReason("");
                        setError("");
                        setRejectDialog(d);
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {donations !== null && pending.length === 0 && (
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
      </Reveal>

      <h2 className="mt-10 text-lg font-semibold text-gray-900">All Donations</h2>
      <Reveal className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Donor Name</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Transaction ID</th>
              <th className="px-4 py-2">Proof</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {donations === null && (
              <tr>
                <td colSpan={7} className="p-4">
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
                <td className="px-4 py-2">
                  <StatusBadge status={d.status} />
                  {d.status === "REJECTED" && d.rejectReason && (
                    <p className="mt-1 text-xs text-gray-400">{d.rejectReason}</p>
                  )}
                </td>
              </tr>
            ))}
            {donations?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10">
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

      <Modal
        open={!!rejectDialog}
        onClose={() => !submitting && setRejectDialog(null)}
        title="Reject donation"
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
