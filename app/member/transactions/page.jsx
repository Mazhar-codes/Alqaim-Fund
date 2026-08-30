"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

const CATEGORY_LABELS = {
  INSTALLMENT_PAYMENT: "Installment Payment",
  LOAN_DISBURSEMENT: "Emergency Loan Disbursed",
  LOAN_REPAYMENT: "Loan Repayment",
  ADJUSTMENT: "Adjustment",
};

function TransactionsContent() {
  const { authedFetch } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch("/api/member/transactions")
      .then((d) => setTransactions(d.transactions || []))
      .catch((e) => setError(e.message));
  }, [authedFetch]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Transaction History</h1>
      <p className="mt-1 text-sm text-gray-600">Every rupee that has moved in or out of your account.</p>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Description</th>
              <th className="px-4 py-2">Direction</th>
              <th className="px-4 py-2">Amount</th>
              <th className="px-4 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-4 py-2">{formatDate(t.createdAt)}</td>
                <td className="px-4 py-2">{t.description || CATEGORY_LABELS[t.category] || t.category}</td>
                <td className="px-4 py-2">
                  <span className={t.direction === "IN" ? "font-medium text-green-700" : "font-medium text-red-700"}>
                    {t.direction === "IN" ? "IN (received)" : "OUT (paid)"}
                  </span>
                </td>
                <td className="px-4 py-2">Rs. {Number(t.amount).toLocaleString()}</td>
                <td className="px-4 py-2">Rs. {Number(t.balanceAfter).toLocaleString()}</td>
              </tr>
            ))}
            {transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No transactions yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function MemberTransactions() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <TransactionsContent />
    </ProtectedRoute>
  );
}
