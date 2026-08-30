"use client";

import { useEffect, useState } from "react";
import { HeartHandshake, ShieldAlert, CheckCircle2, AlertCircle, Inbox } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import FileDropzone from "@/components/FileDropzone";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { formatDate } from "@/lib/formatDate";

function LoanContent() {
  const { authedFetch } = useAuth();
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ amount: "", reasonCategory: "", description: "" });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    authedFetch("/api/member/loan").then(setData).catch((e) => setError(e.message));
  }

  useEffect(load, [authedFetch]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      let proofUrl = null;
      if (file) {
        proofUrl = await uploadToCloudinary(file, "loan_proofs");
      }

      const res = await authedFetch("/api/member/loan", {
        method: "POST",
        body: JSON.stringify({ ...form, proofUrl }),
      });
      setMessage(res.message);
      setForm({ amount: "", reasonCategory: "", description: "" });
      setFile(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        {error ? <p className="text-red-600">{error}</p> : <div className="skeleton h-64 rounded-xl" />}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
          <HeartHandshake className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Emergency Loan Support</h1>
      </div>
      <p className="mt-3 text-sm text-gray-600">
        This fund is only for genuine emergencies — a death in the family, an accident, or a medical
        emergency. Every request is reviewed by an admin before any money is released, and it is repaid
        with no interest, spread across your upcoming installments.
      </p>

      <div
        className={`mt-4 flex items-center gap-2 rounded-lg border p-4 ${
          data.eligibility.eligible ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
        }`}
      >
        {data.eligibility.eligible ? (
          <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-600" />
        ) : (
          <ShieldAlert className="h-5 w-5 flex-shrink-0 text-red-600" />
        )}
        {data.eligibility.eligible ? (
          <p className="font-medium text-green-700">
            You are Eligible — max loan amount Rs. {data.maxLoanAmount.toLocaleString()}
          </p>
        ) : (
          <p className="font-medium text-red-700">{data.eligibility.reason}</p>
        )}
      </div>

      {data.eligibility.eligible && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount Requested</label>
            <input
              type="number"
              required
              max={data.maxLoanAmount}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">What happened?</label>
            <select
              required
              value={form.reasonCategory}
              onChange={(e) => setForm((f) => ({ ...f, reasonCategory: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            >
              <option value="">Select a reason</option>
              {data.reasons.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Describe the emergency</label>
            <textarea
              required
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Explain what happened and why you need support now — this is what the admin reviews."
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supporting Document (death certificate, hospital receipt, FIR, etc.)
            </label>
            <div className="mt-1">
              <FileDropzone file={file} onChange={setFile} label="Optional — click to upload or drag and drop" />
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

          <Button type="submit" variant="dark" loading={submitting}>
            {submitting ? "Submitting…" : "Apply for Emergency Loan"}
          </Button>
        </form>
      )}

      <Reveal>
        <h2 className="mt-10 text-lg font-semibold text-gray-900">Your Requests</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Repaid</th>
                <th className="px-4 py-2">Monthly Deduction</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Admin Note</th>
              </tr>
            </thead>
            <tbody>
              {data.loans.map((l) => (
                <tr key={l.id} className="border-t transition-colors hover:bg-gray-50">
                  <td className="px-4 py-2">{formatDate(l.createdAt)}</td>
                  <td className="px-4 py-2">{l.reasonCategory.replaceAll("_", " ")}</td>
                  <td className="px-4 py-2">Rs. {Number(l.amount).toLocaleString()}</td>
                  <td className="px-4 py-2">Rs. {Number(l.totalRepaid).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    {l.monthlyDeduction ? `Rs. ${Number(l.monthlyDeduction).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-2"><StatusBadge status={l.status} /></td>
                  <td className="px-4 py-2">{l.adminNote || "—"}</td>
                </tr>
              ))}
              {data.loans.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Inbox className="h-6 w-6" />
                      No requests yet
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

export default function MemberLoan() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <LoanContent />
    </ProtectedRoute>
  );
}
