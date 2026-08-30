"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-gray-400">
        <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  return children;
}
