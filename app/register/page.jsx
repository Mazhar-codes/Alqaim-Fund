"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import Navbar from "@/components/Navbar";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState([]);
  const [form, setForm] = useState({
    name: "",
    cnic: "",
    phone: "",
    address: "",
    email: "",
    password: "",
    planId: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((d) => {
        setPlans(d.plans || []);
        const preselect = searchParams.get("plan");
        if (preselect) setForm((f) => ({ ...f, planId: preselect }));
      });
  }, [searchParams]);

  function update(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (!/^\d{5}-\d{7}-\d{1}$/.test(form.cnic)) {
        throw new Error("CNIC must be in the format 42101-1234567-1");
      }
      if (!form.planId) throw new Error("Please select a plan");

      const cred = await createUserWithEmailAndPassword(firebaseAuth, form.email, form.password);
      const idToken = await cred.user.getIdToken();

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idToken,
          name: form.name,
          cnic: form.cnic,
          phone: form.phone,
          address: form.address,
          planId: form.planId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");

      setSuccess(data.memberId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <>
        <Navbar variant="public" />
        <main className="mx-auto max-w-md px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-green-700">Welcome aboard!</h1>
          <p className="mt-3 text-gray-600">
            Your Member ID is <span className="font-mono text-lg font-bold">{success}</span>. Use it with your
            password to log in.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700"
          >
            Go to Login
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar variant="public" />
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Join the Committee</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <Field label="Full Name" value={form.name} onChange={update("name")} required />
          <Field label="CNIC (42101-1234567-1)" value={form.cnic} onChange={update("cnic")} required />
          <Field label="Phone" value={form.phone} onChange={update("phone")} required />
          <Field label="Address" value={form.address} onChange={update("address")} />
          <Field label="Email" type="email" value={form.email} onChange={update("email")} required />
          <Field label="Password" type="password" value={form.password} onChange={update("password")} required minLength={6} />

          <div>
            <label className="block text-sm font-medium text-gray-700">Select Plan</label>
            <select
              value={form.planId}
              onChange={update("planId")}
              required
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            >
              <option value="">Choose a plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — Rs. {Number(p.monthlyAmount).toLocaleString()}/month
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Creating account…" : "Register"}
          </button>
        </form>
      </main>
    </>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input {...props} className="mt-1 w-full rounded-lg border-gray-300 shadow-sm" />
    </div>
  );
}

export default function Register() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  );
}
