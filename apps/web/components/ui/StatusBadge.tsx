import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { resultStatusLabel } from "@/lib/results";

type StatusBadgeProps = {
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
};

const sizeClass = {
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-2.5 py-0.5 text-xs",
} as const;

/** Shared pill used for statuses across cabinets. */
export function StatusBadge({
  children,
  className,
  size = "md",
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-bold",
        sizeClass[size],
        className,
      )}
    >
      {children}
    </span>
  );
}

const resultTone: Record<string, string> = {
  published: "bg-green-50 text-green-800",
  draft: "bg-[#fff7e6] text-[#ad6800]",
  missing: "bg-[#f0f5ff] text-[#1d39c4]",
  absent: "bg-red-50 text-red-700",
};

/** Examiner/results status pill (published / draft / missing / absent). */
export function ResultStatusBadge({ status }: { status: string }) {
  return (
    <StatusBadge className={resultTone[status] ?? "bg-[#eef2f5] text-text-muted"}>
      {resultStatusLabel(status)}
    </StatusBadge>
  );
}
