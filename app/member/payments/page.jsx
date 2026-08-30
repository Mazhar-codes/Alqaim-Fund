"use client";

import { useEffect, useState } from "react";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";
import { firebaseStorage } from "@/lib/firebaseClient";

function PaymentsContent() {
  const { authedFetch, firebaseUser } = useAuth();
  const [payments, setPayments] = useState([]);
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

      const path = `payment_proofs/${firebaseUser.uid}/${Date.now()}-${file.name}`;
      const storageRef = ref(firebaseStorage, path);
      await uploadBytes(storageRef, file);
      const proofUrl = await getDownloadURL(storageRef);

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
      <h1 className="text-2xl font-bold">Upload Payment Proof</h1>
      <p className="mt-1 text-sm text-gray-500">
        Pay to the committee's bank/JazzCash account, then upload your receipt here.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input
              type="number"
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Payment Date</label>
            <input
              type="date"
              required
              value={form.paymentDate}
              onChange={(e) => setForm((f) => ({ ...f, paymentDate: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
          <input
            value={form.transactionId}
            onChange={(e) => setForm((f) => ({ ...f, transactionId: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Screenshot</label>
          <input
            type="file"
            accept="image/*,.pdf"
            required
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
          {submitting ? "Uploading…" : "Submit Payment"}
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">Your Uploads</h2>
      <div className="mt-3 overflow-x-auto rounded-xl border bg-white">
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
            {payments.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td>
                <td className="px-4 py-2">Rs. {Number(p.amount).toLocaleString()}</td>
                <td className="px-4 py-2">{p.transactionId || "—"}</td>
                <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-2">{p.rejectReason || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
