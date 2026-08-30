"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { firebaseAuth } from "@/lib/firebaseClient";

const REPORTS = [
  { type: "collection", label: "Monthly Collection Report" },
  { type: "defaulters", label: "Defaulters Report" },
  { type: "loans", label: "Loan / Emergency Fund Report" },
];

function ReportsContent() {
  const { authedFetch } = useAuth();
  const [active, setActive] = useState("collection");
  const [rows, setRows] = useState([]);
  const [error, setError] = useState("");

  function load(type) {
    setActive(type);
    authedFetch(`/api/admin/reports?type=${type}`)
      .then((d) => setRows(d.rows || []))
      .catch((e) => setError(e.message));
  }

  async function exportXlsx(type) {
    const token = await firebaseAuth.currentUser.getIdToken();
    const res = await fetch(`/api/admin/reports?type=${type}&format=xlsx`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-report.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns = rows[0] ? Object.keys(rows[0]) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Reports</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.type}
            onClick={() => load(r.type)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              active === r.type ? "bg-brand-600 text-white" : "border bg-white hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
        <button onClick={() => load(active)} className="rounded-lg border bg-white px-4 py-2 text-sm hover:bg-gray-50">
          Refresh
        </button>
        <button onClick={() => exportXlsx(active)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800">
          Export to Excel
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-2 capitalize">{c.replace(/([A-Z])/g, " $1")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t">
                {columns.map((c) => (
                  <td key={c} className="px-4 py-2">{row[c]}</td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-center text-gray-400">Click a report above to load it</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}

export default function AdminReports() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <ReportsContent />
    </ProtectedRoute>
  );
}
