"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type FilterSelectProps = Omit<
  SelectHTMLAttributes<HTMLSelectElement>,
  "className"
> & {
  children: ReactNode;
  className?: string;
  selectClassName?: string;
};

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 shrink-0 text-text-muted", className)}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Native select with a right-aligned chevron (no browser arrow mismatch). */
export function FilterSelect({
  children,
  className,
  selectClassName,
  ...props
}: FilterSelectProps) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className={cn(
          "w-full appearance-none rounded-[10px] border border-border bg-white px-3 py-2.5 pr-9 text-sm text-text-primary outline-none",
          "[-moz-appearance:none] [-webkit-appearance:none]",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
          selectClassName,
        )}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center">
        <ChevronDown />
      </span>
    </div>
  );
}
