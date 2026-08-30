"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebaseClient";
import Navbar from "@/components/Navbar";

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
        <h1 className="text-2xl font-bold">Member Login</h1>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Member ID</label>
            <input
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              placeholder="USR001"
              required
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-brand-600 py-2.5 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {submitting ? "Signing in…" : "Log In"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          New here? <a href="/register" className="text-brand-700 hover:underline">Register</a>
        </p>
      </main>
    </>
  );
}
