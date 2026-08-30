"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, SlidersHorizontal, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";

function SettingsContent() {
  const { authedFetch } = useAuth();
  const [settings, setSettings] = useState(null);
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    authedFetch("/api/admin/settings").then((d) => setSettings(d.settings));
    fetch("/api/plans").then((r) => r.json()).then((d) => setPlans(d.plans || []));
  }

  useEffect(load, [authedFetch]);

  async function saveSettings(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const res = await authedFetch("/api/admin/settings", { method: "PATCH", body: JSON.stringify(settings) });
      setSettings(res.settings);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
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

  if (!settings) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="mt-6 skeleton h-64 rounded-xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <SettingsIcon className="h-5 w-5" />
        </span>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {message && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-green-700 animate-fade-in-up">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 flex items-center gap-1.5 text-sm text-red-600 animate-fade-in-up">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </p>
      )}

      <Reveal>
        <form onSubmit={saveSettings} className="mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
            <SlidersHorizontal className="h-4 w-4 text-gray-500" />
            Eligibility & Tenure
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Default Tenure (months)</label>
            <input
              type="number"
              value={settings.defaultTenureMonths}
              onChange={(e) => setSettings((s) => ({ ...s, defaultTenureMonths: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Min. Installments Before Loan Eligible</label>
            <input
              type="number"
              value={settings.minInstallmentsForLoan}
              onChange={(e) => setSettings((s) => ({ ...s, minInstallmentsForLoan: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={settings.smsEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, smsEnabled: e.target.checked }))}
              className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            Send MemberID via SMS on registration
          </label>
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </form>
      </Reveal>

      <Reveal delay={100}>
        <h2 className="mt-8 flex items-center gap-1.5 text-lg font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-gray-500" />
          Plan Amounts
        </h2>
        <div className="mt-3 space-y-3">
          {plans.map((plan) => (
            <PlanRow key={plan.id} plan={plan} onSave={savePlan} />
          ))}
        </div>
      </Reveal>
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
    <div className="grid gap-2 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:grid-cols-5 sm:items-end">
      <div>
        <label className="block text-xs text-gray-500">Plan</label>
        <input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Monthly Amount</label>
        <input
          type="number"
          value={form.monthlyAmount}
          onChange={(e) => setForm((f) => ({ ...f, monthlyAmount: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Tenure (months)</label>
        <input
          type="number"
          value={form.tenureMonths}
          onChange={(e) => setForm((f) => ({ ...f, tenureMonths: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-500">Max Loan Multiplier</label>
        <input
          type="number"
          value={form.maxLoanMultiplier}
          onChange={(e) => setForm((f) => ({ ...f, maxLoanMultiplier: e.target.value }))}
          className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
        />
      </div>
      <Button variant="dark" size="md" onClick={() => onSave(form)}>
        Save
      </Button>
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
