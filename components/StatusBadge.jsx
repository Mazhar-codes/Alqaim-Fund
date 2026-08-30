"use client";

const STYLES = {
  PAID: "bg-green-100 text-green-800",
  APPROVED: "bg-green-100 text-green-800",
  ACTIVE: "bg-green-100 text-green-800",
  COMPLETED: "bg-green-100 text-green-800",
  PENDING: "bg-red-100 text-red-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-red-100 text-red-800",
  SKIPPED: "bg-gray-200 text-gray-700",
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || "bg-gray-200 text-gray-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}
