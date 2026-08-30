"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import { useAuth } from "@/context/AuthContext";

function MemberLedgerContent() {
  const { authedFetch } = useAuth();
  const params = useParams();
  const [member, setMember] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    authedFetch(`/api/admin/members/${params.id}`)
      .then((d) => setMember(d.member))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [authedFetch, params.id]);

  async function toggleSuspend() {
    setError("");
    setMessage("");
    try {
      const nextStatus = member.status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED";
      await authedFetch(`/api/admin/members/${params.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      setMessage(`Member ${nextStatus === "SUSPENDED" ? "suspended" : "reactivated"}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!member) return <main className="p-6 text-gray-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{member.name} <span className="font-mono text-gray-400">({member.memberId})</span></h1>
          <p className="mt-1 text-sm text-gray-500">
            {member.plan.name} · {member.cnic} · {member.phone} · {member.email}
          </p>
        </div>
        <div className="text-right">
          <StatusBadge status={member.status} />
          <button
            onClick={toggleSuspend}
            className="mt-2 block rounded-lg border px-4 py-1.5 text-sm hover:bg-gray-50"
          >
            {member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
          </button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Paid Installments" value={member.paidInstallments} />
        <Stat label="Total Paid" value={`Rs. ${Number(member.totalPaid).toLocaleString()}`} />
        <Stat label="Joined" value={new Date(member.joinDate).toLocaleDateString()} />
      </div>

      <Section title="Installments">
        <Table
          rows={member.installments}
          cols={["installmentNumber", "dueDate", "amount", "loanDeduction", "status"]}
          render={{
            dueDate: (v) => new Date(v).toLocaleDateString(),
            amount: (v) => `Rs. ${Number(v).toLocaleString()}`,
            loanDeduction: (v) => (Number(v) > 0 ? `Rs. ${Number(v).toLocaleString()}` : "—"),
            status: (v) => <StatusBadge status={v} />,
          }}
        />
      </Section>

      <Section title="Loan / Emergency Requests">
        <Table
          rows={member.loanRequests}
          cols={["createdAt", "reasonCategory", "amount", "totalRepaid", "status", "adminNote"]}
          render={{
            createdAt: (v) => new Date(v).toLocaleDateString(),
            reasonCategory: (v) => v.replaceAll("_", " "),
            amount: (v) => `Rs. ${Number(v).toLocaleString()}`,
            totalRepaid: (v) => `Rs. ${Number(v).toLocaleString()}`,
            status: (v) => <StatusBadge status={v} />,
          }}
        />
      </Section>

      <Section title="Transaction Ledger (IN / OUT)">
        <Table
          rows={member.transactions}
          cols={["createdAt", "category", "direction", "amount", "balanceAfter"]}
          render={{
            createdAt: (v) => new Date(v).toLocaleDateString(),
            category: (v) => v.replaceAll("_", " "),
            direction: (v) => (
              <span className={v === "IN" ? "font-medium text-green-700" : "font-medium text-red-700"}>{v}</span>
            ),
            amount: (v) => `Rs. ${Number(v).toLocaleString()}`,
            balanceAfter: (v) => `Rs. ${Number(v).toLocaleString()}`,
          }}
        />
      </Section>
    </main>
  );
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Table({ rows, cols, render = {} }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-600">
          <tr>
            {cols.map((c) => (
              <th key={c} className="px-4 py-2 capitalize">{c.replace(/([A-Z])/g, " $1")}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.id ?? idx} className="border-t">
              {cols.map((c) => (
                <td key={c} className="px-4 py-2">{render[c] ? render[c](row[c]) : row[c] ?? "—"}</td>
              ))}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="px-4 py-6 text-center text-gray-400">Nothing here yet</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminMemberDetail() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <MemberLedgerContent />
    </ProtectedRoute>
  );
}
