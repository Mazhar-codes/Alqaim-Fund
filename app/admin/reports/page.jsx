"use client";

import { useState } from "react";
import { FileBarChart, RefreshCw, Download, FileX2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Reveal from "@/components/Reveal";
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
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  function load(type) {
    setActive(type);
    setLoading(true);
    authedFetch(`/api/admin/reports?type=${type}`)
      .then((d) => setRows(d.rows || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function exportXlsx(type) {
    setExporting(true);
    try {
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
    } finally {
      setExporting(false);
    }
  }

  const columns = rows?.[0] ? Object.keys(rows[0]) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <FileBarChart className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <button
            key={r.type}
            onClick={() => load(r.type)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
              active === r.type
                ? "bg-brand-600 text-white shadow-sm"
                : "border bg-white text-gray-700 hover:border-brand-300 hover:bg-gray-50"
            }`}
          >
            {r.label}
          </button>
        ))}
        <Button variant="outline" size="md" icon={RefreshCw} loading={loading} onClick={() => load(active)}>
          Refresh
        </Button>
        <Button variant="dark" size="md" icon={Download} loading={exporting} onClick={() => exportXlsx(active)}>
          Export to Excel
        </Button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <Reveal className="mt-6 overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-4 py-2 capitalize">{c.replace(/([A-Z])/g, " $1")}</th>
              ))}
              {columns.length === 0 && <th className="px-4 py-2" />}
            </tr>
          </thead>
          <tbody>
            {rows === null && !loading && (
              <tr>
                <td className="px-4 py-10">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <FileX2 className="h-6 w-6" />
                    Click a report above to load it
                  </div>
                </td>
              </tr>
            )}
            {loading && (
              <tr>
                <td className="p-4">
                  <div className="skeleton h-32 rounded-lg" />
                </td>
              </tr>
            )}
            {!loading &&
              rows?.map((row, idx) => (
                <tr key={idx} className="border-t transition-colors hover:bg-gray-50">
                  {columns.map((c) => (
                    <td key={c} className="px-4 py-2">{row[c]}</td>
                  ))}
                </tr>
              ))}
            {!loading && rows?.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-gray-400">No data for this report yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </Reveal>
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
