"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ListChecks, PiggyBank, CalendarDays, ShieldOff, ShieldCheck, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function MemberLedgerContent() {
  const { authedFetch } = useAuth();
  const params = useParams();
  const [member, setMember] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  function load() {
    authedFetch(`/api/admin/members/${params.id}`)
      .then((d) => setMember(d.member))
      .catch((e) => setError(e.message));
  }

  useEffect(load, [authedFetch, params.id]);

  async function toggleSuspend() {
    setError("");
    setMessage("");
    setToggling(true);
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
    } finally {
      setToggling(false);
    }
  }

  if (error) return <main className="p-6 text-red-600">{error}</main>;
  if (!member) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="skeleton h-16 w-96 rounded-xl" />
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-start justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-4">
          {member.photoUrl ? (
            <img src={member.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover ring-2 ring-brand-100" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-50 text-xl font-semibold text-brand-700">
              {member.name?.[0]?.toUpperCase() || "?"}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{member.name} <span className="font-mono text-gray-400">({member.memberId})</span></h1>
            <p className="mt-1 text-sm text-gray-500">
              {member.plan.name} · {member.cnic} · {member.phone} · {member.email}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <StatusBadge status={member.status} />
          <Button
            variant={member.status === "SUSPENDED" ? "success" : "outline"}
            size="sm"
            icon={member.status === "SUSPENDED" ? ShieldCheck : ShieldOff}
            loading={toggling}
            onClick={toggleSuspend}
          >
            {member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
          </Button>
        </div>
      </div>

      {message && <p className="mt-4 animate-fade-in-up text-sm text-green-700">{message}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={ListChecks} label="Paid Installments" value={member.paidInstallments} />
        <Stat icon={PiggyBank} label="Total Paid" value={`Rs. ${Number(member.totalPaid).toLocaleString()}`} accent="text-green-600" />
        <Stat icon={CalendarDays} label="Joined" value={formatDate(member.joinDate)} />
      </div>

      <Section title="Installments">
        <Table
          rows={member.installments}
          cols={["installmentNumber", "dueDate", "amount", "loanDeduction", "status"]}
          render={{
            dueDate: (v) => formatDate(v),
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
            createdAt: (v) => formatDate(v),
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
            createdAt: (v) => formatDate(v),
            category: (v) => v.replaceAll("_", " "),
            direction: (v) =>
              v === "IN" ? (
                <span className="inline-flex items-center gap-1 font-medium text-green-700">
                  <ArrowDownCircle className="h-3.5 w-3.5" /> IN
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 font-medium text-red-700">
                  <ArrowUpCircle className="h-3.5 w-3.5" /> OUT
                </span>
              ),
            amount: (v) => `Rs. ${Number(v).toLocaleString()}`,
            balanceAfter: (v) => `Rs. ${Number(v).toLocaleString()}`,
          }}
        />
      </Section>
    </main>
  );
}

function Stat({ icon: Icon, label, value, accent = "text-gray-900" }) {
  return (
    <div className="group rounded-xl border bg-white p-4 transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      </div>
      <p className={`mt-2 text-lg font-semibold ${accent}`}>{value}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <Reveal className="mt-8">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </Reveal>
  );
}

function Table({ rows, cols, render = {} }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
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
            <tr key={row.id ?? idx} className="border-t transition-colors hover:bg-gray-50">
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
