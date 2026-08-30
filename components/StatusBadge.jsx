"use client";

import { CheckCircle2, Clock, XCircle, MinusCircle, Activity } from "lucide-react";

const CONFIG = {
  PAID: { cls: "bg-green-50 text-green-700 ring-green-200", icon: CheckCircle2 },
  APPROVED: { cls: "bg-green-50 text-green-700 ring-green-200", icon: CheckCircle2 },
  ACTIVE: { cls: "bg-blue-50 text-blue-700 ring-blue-200", icon: Activity },
  COMPLETED: { cls: "bg-green-50 text-green-700 ring-green-200", icon: CheckCircle2 },
  PENDING: { cls: "bg-amber-50 text-amber-700 ring-amber-200", icon: Clock },
  REJECTED: { cls: "bg-red-50 text-red-700 ring-red-200", icon: XCircle },
  SUSPENDED: { cls: "bg-red-50 text-red-700 ring-red-200", icon: XCircle },
  SKIPPED: { cls: "bg-gray-100 text-gray-600 ring-gray-200", icon: MinusCircle },
};

export default function StatusBadge({ status }) {
  const { cls, icon: Icon } = CONFIG[status] || { cls: "bg-gray-100 text-gray-600 ring-gray-200", icon: MinusCircle };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${cls}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  );
}
