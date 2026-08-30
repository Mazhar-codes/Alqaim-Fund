"use client";

import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

function SettingsContent() {
  const { authedFetch } = useAuth();
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function load() {
    authedFetch("/api/admin/settings").then((d) => setSettings(d.settings));
    fetch("/api/plans").then((r) => r.json()).then((d) => setPlans(d.plans || []));
  }

  useEffect(load, [authedFetch]);

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await authedFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setSettings(res.settings);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function savePlan(plan) {
    setError("");
    setMessage("");
    try {
      await authedFetch("/api/plans", { method: "PATCH", body: JSON.stringify(plan) });
      setMessage(`${plan.name} updated.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!settings) return <main className="p-6 text-gray-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={saveSettings} className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Eligibility & Tenure</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Default Tenure (months)</label>
          <input
            type="number"
            value={settings.defaultTenureMonths}
            onChange={(e) => setSettings((s) => ({ ...s, defaultTenureMonths: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Min. Installments Before Loan Eligible</label>
          <input
            type="number"
            value={settings.minInstallmentsForLoan}
            onChange={(e) => setSettings((s) => ({ ...s, minInstallmentsForLoan: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.smsEnabled}
            onChange={(e) => setSettings((s) => ({ ...s, smsEnabled: e.target.checked }))}
          />
          Send MemberID via SMS on registration
        </label>
        <button className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700">
          Save Settings
        </button>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Plan Amounts</h2>
      <div className="mt-3 space-y-3">
        {plans.map((plan) => (
          <PlanRow key={plan.id} plan={plan} onSave={savePlan} />
        ))}
      </div>
    </main>
  );
}

function PlanRow({ plan, onSave }) {
  const [form, setForm] = useState({
    id: plan.id,
    name: plan.name,
    monthlyAmount: plan.monthlyAmount,
    tenureMonths: plan.tenureMonths,
    maxLoanMultiplier: plan.maxLoanMultiplier,
  });

  return (
    <div className="grid gap-2 rounded-xl border bg-white p-4 sm:grid-cols-5 sm:items-end">
      <div>
        <label className="block text-xs text-gray-500">Plan</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Monthly Amount</label>
        <input
          type="number"
          value={form.monthlyAmount}
          onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Tenure (months)</label>
        <input
          type="number"
          value={form.tenureMonths}
          onChange={(e) => setForm((f) => ({ ...f, tenureMonths: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Max Loan Multiplier</label>
        <input
          type="number"
          value={form.maxLoanMultiplier}
          onChange={(e) => setForm((f) => ({ ...f, maxLoanMultiplier: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
        />
      </div>
      <button onClick={() => onSave(form)} className="rounded-lg bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-800">
        Save
      </button>
    </div>
  );
}

export default function AdminSettings() {
  return (
    <ProtectedRoute role="admin">
      <Navbar variant="admin" />
      <SettingsContent />
    </ProtectedRoute>
  );
}
