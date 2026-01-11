import { cn } from "@/lib/utils";

type Status = "queued" | "running" | "succeeded" | "failed" | "online" | "offline" | string;

export function StatusBadge({ status, className }: { status: Status, className?: string }) {
  let variant = "bg-slate-100 text-slate-700 border-slate-200";
  
  switch (status?.toLowerCase()) {
    case "running":
    case "online":
      variant = "bg-blue-50 text-blue-700 border-blue-200 animate-pulse-subtle";
      break;
    case "succeeded":
      variant = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "failed":
    case "offline":
      variant = "bg-red-50 text-red-700 border-red-200";
      break;
    case "queued":
      variant = "bg-amber-50 text-amber-700 border-amber-200";
      break;
  }

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider",
      variant,
      className
    )}>
      {status}
    </span>
  );
}
