import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="text-sm font-semibold text-text-secondary">{label}</span>
      <input
        id={inputId}
        className={cn(
          "w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors",
          "placeholder:text-text-muted",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
          error ? "border-red-400" : "border-border",
          className,
        )}
        {...props}
      />
      {error ? <span className="text-xs font-medium text-red-600">{error}</span> : null}
    </label>
  );
}
