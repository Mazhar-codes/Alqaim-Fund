"use client";

import { useEffect, useState } from "react";
import { Receipt, AlertCircle, CheckCircle2, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import FileDropzone from "@/components/FileDropzone";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatDate } from "@/lib/formatDate";

function PaymentsContent() {
  const { authedFetch } = useAuth();
  const [payments, setPayments] = useState(null);
  const [form, setForm] = useState({ amount: "", paymentDate: "", transactionId: "" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    authedFetch("/api/member/payments").then((d) => setPayments(d.payments || []));
  }

  useEffect(load, [authedFetch]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      if (!file) throw new Error("Please attach a screenshot of the payment");

      const proofUrl = await uploadToCloudinary(file, "payment_proofs");

      const res = await authedFetch("/api/member/payments", {
        method: "POST",
        body: JSON.stringify({ ...form, proofUrl }),
      });
      setMessage(res.message);
      setForm({ amount: "", paymentDate: "", transactionId: "" });
      setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <Receipt className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Upload Payment Proof</h1>
          <p className="text-sm text-gray-500">
            Pay to the committee's bank/JazzCash account, then upload your receipt here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
            <input
              type="date"
              required
              value={form.paymentDate}
              onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
          <input
            value={form.transactionId}
            onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Screenshot</label>
          <div className="mt-1">
            <FileDropzone file={file} onChange={setFile} required />
          </div>
        </div>

        {message && (
          <p className="flex items-center gap-1.5 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
            {message}
          </p>
        )}
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        <Button type="submit" loading={submitting}>
          {submitting ? "Uploading…" : "Submit Payment"}
        </Button>
      </form>

      <Reveal>
        <h2 className="mt-10 text-lg font-semibold text-gray-900">Your Uploads</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Transaction ID</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Reject Reason</th>
              </tr>
            </thead>
            <tbody>
              {payments === null && (
                <tr>
                  <td colSpan={5} className="p-4">
                    <div className="skeleton h-16 rounded-lg" />
                  </td>
                </tr>
              )}
              {payments?.map((p) => (
                <tr key={p.id} className="border-t transition-colors hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(p.paymentDate)}</td>
                  <td className="px-4 py-2">Rs. {Number(p.amount).toLocaleString()}</td>
                  <td className="px-4 py-2">{p.transactionId || "—"}</td>
                  <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-2">{p.rejectReason || "—"}</td>
                </tr>
              ))}
              {payments?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Inbox className="h-6 w-6" />
                      No uploads yet
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Reveal>
    </main>
  );
}

export default function MemberPayments() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <PaymentsContent />
    </ProtectedRoute>
  );
}
