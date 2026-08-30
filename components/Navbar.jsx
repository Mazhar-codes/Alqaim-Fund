"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function Navbar({ variant = "public" }) {
  const { firebaseUser, signOut } = useAuth();

  return (
    <nav className="flex items-center justify-between border-b bg-white px-4 py-3 sm:px-6">
      <Link href="/" className="text-lg font-bold text-brand-700">
        Alqaim Fund
      </Link>
      <div className="flex items-center gap-4 text-sm">
        {variant === "member" && (
          <>
            <Link href="/member/dashboard" className="hover:text-brand-700">Dashboard</Link>
            <Link href="/member/payments" className="hover:text-brand-700">Payments</Link>
            <Link href="/member/loan" className="hover:text-brand-700">Emergency Loan</Link>
            <Link href="/member/transactions" className="hover:text-brand-700">Transactions</Link>
            <Link href="/member/profile" className="hover:text-brand-700">Profile</Link>
          </>
        )}
        {variant === "admin" && (
          <>
            <Link href="/admin" className="hover:text-brand-700">Overview</Link>
            <Link href="/admin/members" className="hover:text-brand-700">Members</Link>
            <Link href="/admin/payments" className="hover:text-brand-700">Payment Queue</Link>
            <Link href="/admin/loans" className="hover:text-brand-700">Loan/Emergency Queue</Link>
            <Link href="/admin/reports" className="hover:text-brand-700">Reports</Link>
            <Link href="/admin/settings" className="hover:text-brand-700">Settings</Link>
          </>
        )}
        {firebaseUser && (
          <button onClick={signOut} className="rounded bg-gray-100 px-3 py-1 hover:bg-gray-200">
            Log out
          </button>
        )}
      </div>
    </nav>
  );
}
