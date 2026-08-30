"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

/** Wrap a page's content; redirects to /login if not signed in, or if role doesn't match. */
export default function ProtectedRoute({ role, children }) {
  const { firebaseUser, role: currentRole, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!firebaseUser) {
      router.replace(role === "admin" ? "/admin/login" : "/login");
      return;
    }
    if (role && currentRole !== role) {
      router.replace(currentRole === "admin" ? "/admin" : "/member/dashboard");
    }
  }, [loading, firebaseUser, currentRole, role, router]);

  if (loading || !firebaseUser || (role && currentRole !== role)) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading…</div>;
  }

  return children;
}
