"use client";

import { useEffect, useState } from "react";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from "firebase/auth";
import { UserCircle, Camera, CheckCircle2, AlertCircle, KeyRound } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Reveal from "@/components/Reveal";
import { useAuth } from "@/context/AuthContext";
import { uploadToCloudinary } from "@/lib/cloudinary";

function ProfileContent() {
  const { authedFetch, firebaseUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ phone: "", address: "" });
  const [pwForm, setPwForm] = useState({ current: "", next: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

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
    setSavingProfile(true);
    try {
      const res = await authedFetch("/api/member/profile", { method: "PATCH", body: JSON.stringify(form) });
      setProfile(res.profile);
      setMessage("Profile updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setMessage("");
    setUploadingPhoto(true);
    try {
      const photoUrl = await uploadToCloudinary(file, "profile_photos");
      const res = await authedFetch("/api/member/profile", { method: "PATCH", body: JSON.stringify({ photoUrl }) });
      setProfile(res.profile);
      setMessage("Profile picture updated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setChangingPw(true);
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, pwForm.current);
      await reauthenticateWithCredential(firebaseUser, credential);
      await updatePassword(firebaseUser, pwForm.next);
      setPwForm({ current: "", next: "" });
      setMessage("Password changed.");
    } catch (err) {
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setChangingPw(false);
    }
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="mt-6 skeleton h-28 rounded-xl" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
          <UserCircle className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500">
            {profile.memberId} · {profile.name} · {profile.email}
          </p>
        </div>
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

      <Reveal className="mt-6 flex items-center gap-4 rounded-xl border bg-white p-5 shadow-sm">
        {profile.photoUrl ? (
          <img src={profile.photoUrl} alt="" className="h-20 w-20 rounded-full object-cover ring-2 ring-brand-100" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-50 text-2xl font-semibold text-brand-700">
            {profile.name?.[0]?.toUpperCase() || "?"}
          </div>
        )}
        <div>
          <p className="font-semibold text-gray-900">Profile Picture</p>
          <p className="text-sm text-gray-500">Visible to you and to admin on your member ledger.</p>
          <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:border-brand-300 hover:bg-brand-50">
            <Camera className="h-4 w-4" />
            {uploadingPhoto ? "Uploading…" : "Change Photo"}
            <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploadingPhoto} className="hidden" />
          </label>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <form onSubmit={saveProfile} className="mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">Contact Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Address</label>
            <input
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" loading={savingProfile}>
            Save
          </Button>
        </form>
      </Reveal>

      <Reveal delay={160}>
        <form onSubmit={changePassword} className="mt-6 space-y-4 rounded-xl border bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-1.5 font-semibold text-gray-900">
            <KeyRound className="h-4 w-4 text-gray-500" />
            Change Password
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Password</label>
            <input
              type="password"
              required
              value={pwForm.current}
              onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
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
              className="mt-1 w-full rounded-lg border-gray-300 shadow-sm transition focus:border-brand-500 focus:ring-brand-500"
            />
          </div>
          <Button type="submit" variant="dark" loading={changingPw}>
            Change Password
          </Button>
        </form>
      </Reveal>
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
