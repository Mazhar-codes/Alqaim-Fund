"use client";

import { Loader2 } from "lucide-react";

const VARIANTS = {
  primary:
    "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm hover:shadow-md focus-visible:ring-brand-400",
  dark: "bg-gray-900 text-white hover:bg-gray-800 active:bg-black shadow-sm hover:shadow-md focus-visible:ring-gray-400",
  success:
    "bg-accent-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm hover:shadow-md focus-visible:ring-emerald-400",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm hover:shadow-md focus-visible:ring-red-400",
  outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus-visible:ring-gray-300",
  ghost: "text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-300",
};

const SIZES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-5 py-2.5 text-sm",
  lg: "px-6 py-3 text-base",
};

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: IconComponent,
  className = "",
  children,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium
        transition-all duration-150 ease-out
        hover:-translate-y-0.5 active:translate-y-0
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0
        ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        IconComponent && <IconComponent className="h-4 w-4" />
      )}
      {children}
    </button>
  );
}
