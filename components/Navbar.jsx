"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HandCoins,
  LayoutDashboard,
  Wallet,
  HeartHandshake,
  Receipt,
  UserCircle,
  Users,
  ClipboardCheck,
  FileBarChart,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Languages,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

const PUBLIC_LINKS = [{ href: "/", key: "nav.home", icon: Home }];

const MEMBER_LINKS = [
  { href: "/member/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/member/payments", key: "nav.payments", icon: Wallet },
  { href: "/member/loan", key: "nav.loan", icon: HeartHandshake },
  { href: "/member/transactions", key: "nav.transactions", icon: Receipt },
  { href: "/member/profile", key: "nav.profile", icon: UserCircle },
];

const ADMIN_LINKS = [
  { href: "/admin", key: "nav.overview", icon: LayoutDashboard },
  { href: "/admin/members", key: "nav.members", icon: Users },
  { href: "/admin/payments", key: "nav.paymentQueue", icon: ClipboardCheck },
  { href: "/admin/loans", key: "nav.loanQueue", icon: HeartHandshake },
  { href: "/admin/reports", key: "nav.reports", icon: FileBarChart },
  { href: "/admin/settings", key: "nav.settings", icon: Settings },
];

export default function Navbar({ variant = "public" }) {
  const { firebaseUser, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = variant === "member" ? MEMBER_LINKS : variant === "admin" ? ADMIN_LINKS : PUBLIC_LINKS;

  function LangToggle({ className = "" }) {
    return (
      <button
        onClick={() => setLang(lang === "ur" ? "en" : "ur")}
        className={`flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 font-medium text-gray-600 transition hover:bg-gray-100 ${className}`}
      >
        <Languages className="h-4 w-4" />
        {lang === "ur" ? "English" : "اردو"}
      </button>
    );
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-gray-200/80 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-600 to-brand-800 text-white shadow-sm">
            <HandCoins className="h-4.5 w-4.5" />
          </span>
          Alqaim Fund
        </Link>

        <div className="hidden items-center gap-1 text-sm lg:flex">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium transition-colors ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(key)}
              </Link>
            );
          })}
          <LangToggle className="ml-2" />
          {firebaseUser && (
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </button>
          )}
        </div>

        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 lg:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-2 lg:hidden">
          {links.map(({ href, key, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium ${
                  active ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t(key)}
              </Link>
            );
          })}
          <div className="mt-1 px-1">
            <LangToggle className="w-full justify-center" />
          </div>
          {firebaseUser && (
            <button
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4" />
              {t("nav.logout")}
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
