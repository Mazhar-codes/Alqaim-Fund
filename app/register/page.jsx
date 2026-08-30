"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { PartyPopper, UserPlus, AlertCircle } from "lucide-react";
import { firebaseAuth } from "@/lib/firebaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";

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
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <>
        <Navbar variant="public" />
        <main className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center animate-scale-in">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <PartyPopper className="h-8 w-8" />
          </span>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">Welcome aboard!</h1>
          <p className="mt-3 text-gray-600">
            Your Member ID is{" "}
            <span className="rounded-md bg-brand-50 px-2 py-1 font-mono text-lg font-bold text-brand-700">{success}</span>.
            Use it with your password to log in.
          </p>
          <Button onClick={() => router.push("/login")} className="mt-6">
            Go to Login
          </Button>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar variant="public" />
      <main className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <UserPlus className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Join the Committee</h1>
          </div>

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
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
              >
                <option value="">Choose a plan</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Rs. {Number(p.monthlyAmount).toLocaleString()}/month
                  </option>
                ))}
              </select>
            </div>

            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? "Creating account…" : "Register"}
            </Button>
          </form>
        </div>
      </main>
    </>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
      />
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
