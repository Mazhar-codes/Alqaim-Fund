"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
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

  if (!data) return <main className="p-6 text-gray-500">{error || "Loading…"}</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Emergency Loan Support</h1>
      <p className="mt-1 text-sm text-gray-600">
        This fund is only for genuine emergencies — a death in the family, an accident, or a medical
        emergency. Every request is reviewed by an admin before any money is released, and it is repaid
        with no interest, spread across your upcoming installments.
      </p>

      <div className="mt-4 rounded-lg border bg-white p-4">
        {data.eligibility.eligible ? (
          <p className="font-medium text-green-700">
            You are Eligible — max loan amount Rs. {data.maxLoanAmount.toLocaleString()}
          </p>
        ) : (
          <p className="font-medium text-red-700">{data.eligibility.reason}</p>
        )}
      </div>

      {data.eligibility.eligible && (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-5">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount Requested</label>
            <input
              type="number"
              required
              max={data.maxLoanAmount}
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">What happened?</label>
            <select
              required
              value={form.reasonCategory}
              onChange={(e) => setForm((f) => ({ ...f, reasonCategory: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
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
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Supporting Document (death certificate, hospital receipt, FIR, etc.)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1 w-full text-sm"
            />
          </div>

          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Apply for Emergency Loan"}
          </button>
        </form>
      )}

      <h2 className="mt-10 text-lg font-semibold">Your Requests</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
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
              <tr key={l.id} className="border-t">
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
          </tbody>
        </table>
      </div>
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
