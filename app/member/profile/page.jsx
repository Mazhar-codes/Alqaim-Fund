"use client";

import { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

function ProfileContent() {
  const { authedFetch, firebaseUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: "", address: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    authedFetch("/api/member/profile").then((d) => {
      setProfile(d.profile);
      setForm({ phone: d.profile.phone, address: d.profile.address || "" });
    });
  }, [authedFetch]);

  async function saveProfile(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const res = await authedFetch("/api/member/profile", { method: "PATCH", body: JSON.stringify(form) });
      setProfile(res.profile);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, pwForm.current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, pwForm.next);
      setPwForm({ current: "", next: "" });
      setMessage("Password changed.");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    }
  }

  if (!profile) return <main className="p-6 text-gray-500">Loading…</main>;

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-bold">Profile</h1>
      <p className="mt-1 text-sm text-gray-500">
        {profile.memberId} · {profile.name} · {profile.email}
      </p>

      {message && <p className="mt-4 text-sm text-green-700">{message}</p>}
      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <form onSubmit={saveProfile} className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Contact Details</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Phone</label>
          <input
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            value={form.address}
            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <button className="rounded-lg bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700">
          Save
        </button>
      </form>

      <form onSubmit={changePassword} className="mt-6 space-y-4 rounded-xl border bg-white p-5">
        <h2 className="font-semibold">Change Password</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700">Current Password</label>
          <input
            type="password"
            required
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">New Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={pwForm.next}
            onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            className="mt-1 w-full rounded-lg border-gray-300 shadow-sm"
          />
        </div>
        <button className="rounded-lg bg-gray-900 px-5 py-2 font-medium text-white hover:bg-gray-800">
          Change Password
        </button>
      </form>
    </main>
  );
}

export default function MemberProfile() {
  return (
    <ProtectedRoute role="member">
      <Navbar variant="member" />
      <ProfileContent />
    </ProtectedRoute>
  );
}
