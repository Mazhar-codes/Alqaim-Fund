"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ListChecks,
  PiggyBank,
  CalendarDays,
  ShieldOff,
  ShieldCheck,
  ArrowDownCircle,
  ArrowUpCircle,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import StatusBadge from "@/components/StatusBadge";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { formatDate } from "@/lib/formatDate";

function MemberLedgerContent() {
  const { authedFetch } = useAuth();
  const params = useParams();
  const router = useRouter();
  const [member, setMember] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

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

  async function deleteMember() {
    setDeleteError("");
    setDeleting(true);
    try {
      await authedFetch(`/api/admin/members/${params.id}`, { method: "DELETE" });
      router.push("/admin/members");
    } catch (err) {
      setDeleteError(err.message);
    } finally {
      setDeleting(false);
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
          <div className="flex gap-2">
            <Button
              variant={member.status === "SUSPENDED" ? "success" : "outline"}
              size="sm"
              icon={member.status === "SUSPENDED" ? ShieldCheck : ShieldOff}
              loading={toggling}
              onClick={toggleSuspend}
            >
              {member.status === "SUSPENDED" ? "Reactivate" : "Suspend"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              onClick={() => {
                setDeleteConfirmText("");
                setDeleteError("");
                setDeleteOpen(true);
              }}
            >
              Delete
            </Button>
          </div>
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
          cols={["installmentNumber", "dueDate", "amount", "loanDeduction", "amountPaid", "status"]}
          render={{
            dueDate: (v) => formatDate(v),
            amount: (v) => `Rs. ${Number(v).toLocaleString()}`,
            loanDeduction: (v) => (Number(v) > 0 ? `Rs. ${Number(v).toLocaleString()}` : "—"),
            amountPaid: (v, row) => {
              if (v == null) return "—";
              const short = Number(row.amount) - Number(v);
              if (short > 0.01) {
                return (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Rs. {Number(v).toLocaleString()} (Rs. {short.toLocaleString()} short)
                  </span>
                );
              }
              return `Rs. ${Number(v).toLocaleString()}`;
            },
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

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete member account"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              icon={Trash2}
              loading={deleting}
              disabled={deleteConfirmText !== member.memberId}
              onClick={deleteMember}
            >
              Permanently Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-600">
          This permanently deletes <span className="font-semibold text-gray-900">{member.name}</span>'s account,
          login, and every installment, payment, loan, and transaction record. <span className="font-semibold text-red-600">
            This cannot be undone.
          </span>
        </p>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          Type <span className="font-mono">{member.memberId}</span> to confirm
        </label>
        <input
          value={deleteConfirmText}
          onChange={(e) => setDeleteConfirmText(e.target.value)}
          placeholder={member.memberId}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-red-500 focus:ring-red-500"
        />
        {deleteError && <p className="mt-2 text-sm text-red-600">{deleteError}</p>}
      </Modal>
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
                <td key={c} className="px-4 py-2">{render[c] ? render[c](row[c], row) : row[c] ?? "—"}</td>
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
