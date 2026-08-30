"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LogIn, AlertCircle } from "lucide-react";
import { firebaseAuth } from "@/lib/firebaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";

export default function Login() {
  const router = useRouter();
  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const lookupRes = await fetch(`/api/auth/lookup?loginId=${encodeURIComponent(memberId.trim())}`);
      const lookupData = await lookupRes.json();
      if (!lookupRes.ok) throw new Error(lookupData.error || "Account not found");

      const cred = await signInWithEmailAndPassword(firebaseAuth, lookupData.email, password);
      const tokenResult = await cred.user.getIdTokenResult();

      router.push(tokenResult.claims.role === "admin" ? "/admin" : "/member/dashboard");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <Navbar variant="public" />
      <main className="mx-auto max-w-sm px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <LogIn className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Member Login</h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Member ID</label>
              <input
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="USR001"
                required
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            {error && (
              <p className="flex items-center gap-1.5 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </p>
            )}
            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? "Signing in…" : "Log In"}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          New here?{" "}
          <a href="/register" className="font-medium text-brand-700 hover:underline">
            Register
          </a>
        </p>
      </main>
    </>
  );
}
