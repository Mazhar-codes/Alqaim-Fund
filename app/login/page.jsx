"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { LogIn, AlertCircle, HelpCircle } from "lucide-react";
import { firebaseAuth } from "@/lib/firebaseClient";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Modal from "@/components/Modal";
import { formatCnic } from "@/lib/validators";
import { useLanguage } from "@/context/LanguageContext";

// Remembers the last-used Member ID on this device/browser so the login form
// pre-fills it next time — a fallback for whenever the browser's own
// password-manager autofill doesn't kick in.
const LAST_MEMBER_ID_KEY = "ags_last_member_id";

export default function Login() {
  const router = useRouter();
  const { t } = useLanguage();
  const [memberId, setMemberId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetId, setResetId] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [recoverOpen, setRecoverOpen] = useState(false);
  const [recoverCnic, setRecoverCnic] = useState("");
  const [recoverPhone, setRecoverPhone] = useState("");
  const [recoverResult, setRecoverResult] = useState(null);
  const [recoverError, setRecoverError] = useState("");
  const [recoverSubmitting, setRecoverSubmitting] = useState(false);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem(LAST_MEMBER_ID_KEY);
      if (remembered) setMemberId(remembered);
    } catch {
      // localStorage can throw in private-browsing/blocked-storage contexts — fine to skip.
    }
  }, []);

  async function handleRecover(e) {
    e.preventDefault();
    setRecoverError("");
    setRecoverResult(null);
    setRecoverSubmitting(true);
    try {
      const res = await fetch("/api/auth/recover-memberid", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cnic: recoverCnic, phone: recoverPhone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No matching account found");
      setRecoverResult(data.memberId);
    } catch (err) {
      setRecoverError(err.message);
    } finally {
      setRecoverSubmitting(false);
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetError("");
    setResetMessage("");
    setResetSubmitting(true);
    try {
      const lookupRes = await fetch(`/api/auth/lookup?loginId=${encodeURIComponent(resetId.trim())}`);
      const lookupData = await lookupRes.json();
      // Always show the same success message regardless of whether the
      // account exists — don't let this form be used to enumerate accounts.
      if (lookupRes.ok) {
        await sendPasswordResetEmail(firebaseAuth, lookupData.email).catch(() => {});
      }
      setResetMessage(t("login.resetSent"));
    } catch {
      setResetMessage(t("login.resetSent"));
    } finally {
      setResetSubmitting(false);
    }
  }

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

      try {
        localStorage.setItem(LAST_MEMBER_ID_KEY, memberId.trim().toUpperCase());
      } catch {
        // ignore — same private-browsing/blocked-storage case as above
      }

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
            <h1 className="text-2xl font-bold text-gray-900">{t("login.title")}</h1>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4" autoComplete="on">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("login.memberId")}</label>
              <input
                name="username"
                autoComplete="username"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="USR001"
                required
                className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t("login.password")}</label>
              <input
                type="password"
                name="password"
                autoComplete="current-password"
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
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  setRecoverCnic("");
                  setRecoverPhone("");
                  setRecoverResult(null);
                  setRecoverError("");
                  setRecoverOpen(true);
                }}
                className="flex items-center gap-1 font-medium text-gray-500 hover:underline"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                {t("login.forgotMemberId")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetId("");
                  setResetMessage("");
                  setResetError("");
                  setResetOpen(true);
                }}
                className="font-medium text-brand-700 hover:underline"
              >
                {t("login.forgotPassword")}
              </button>
            </div>
            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? t("login.signingIn") : t("login.logIn")}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sm text-gray-500">
          {t("login.newHere")}{" "}
          <a href="/register" className="font-medium text-brand-700 hover:underline">
            {t("login.register")}
          </a>
        </p>
      </main>

      <Modal open={resetOpen} onClose={() => !resetSubmitting && setResetOpen(false)} title={t("login.resetTitle")}>
        <form onSubmit={handleReset} className="space-y-4">
          <p className="text-sm text-gray-600">{t("login.resetBody")}</p>
          <input
            value={resetId}
            onChange={(e) => setResetId(e.target.value)}
            placeholder="USR001"
            required
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
          />
          {resetMessage && <p className="text-sm text-green-700">{resetMessage}</p>}
          {resetError && <p className="text-sm text-red-600">{resetError}</p>}
          <Button type="submit" loading={resetSubmitting} className="w-full">
            {resetSubmitting ? t("login.resetSending") : t("login.resetSend")}
          </Button>
        </form>
      </Modal>

      <Modal
        open={recoverOpen}
        onClose={() => !recoverSubmitting && setRecoverOpen(false)}
        title={t("login.recoverIdTitle")}
      >
        <form onSubmit={handleRecover} className="space-y-4">
          <p className="text-sm text-gray-600">{t("login.recoverIdBody")}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("login.recoverIdCnic")}</label>
            <input
              value={recoverCnic}
              onChange={(e) => setRecoverCnic(formatCnic(e.target.value))}
              placeholder="42101-1234567-1"
              inputMode="numeric"
              maxLength={15}
              required
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{t("login.recoverIdPhone")}</label>
            <input
              value={recoverPhone}
              onChange={(e) => setRecoverPhone(e.target.value)}
              required
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          {recoverResult && (
            <p className="text-sm text-green-700">
              {t("login.recoverIdFound")}{" "}
              <span className="rounded-md bg-brand-50 px-2 py-1 font-mono font-bold text-brand-700">{recoverResult}</span>
            </p>
          )}
          {recoverError && <p className="text-sm text-red-600">{recoverError}</p>}
          <Button type="submit" loading={recoverSubmitting} className="w-full">
            {recoverSubmitting ? t("login.recoverIdSubmitting") : t("login.recoverIdSubmit")}
          </Button>
        </form>
      </Modal>
    </>
  );
}
