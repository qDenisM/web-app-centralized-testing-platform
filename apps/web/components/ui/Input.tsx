import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  /** OCR low-confidence highlight */
  doubt?: boolean;
};

export function Input({
  label,
  error,
  doubt = false,
  id,
  className,
  ...props
}: InputProps) {
  const inputId = id || props.name;

  return (
    <label className="block space-y-1.5" htmlFor={inputId}>
      <span className="flex items-center justify-between gap-2 text-sm font-semibold text-text-secondary">
        <span>{label}</span>
        {doubt ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-[#E2B45A]/55 bg-[#FFF4D6] px-2 py-0.5 text-[10px] font-bold leading-tight text-[#9A6B00]">
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 shrink-0"
              fill="currentColor"
              aria-hidden
            >
              <path d="M8.87 2.4a1 1 0 0 0-1.74 0L1.2 12.1A1 1 0 0 0 2.07 13.5h11.86a1 1 0 0 0 .87-1.4L8.87 2.4ZM8 6.25a.75.75 0 0 1 .75.75v2a.75.75 0 0 1-1.5 0v-2A.75.75 0 0 1 8 6.25Zm0 5.25a.9.9 0 1 1 0-1.8.9.9 0 0 1 0 1.8Z" />
            </svg>
            Проверьте: распознано с сомнениями
          </span>
        ) : null}
      </span>
      <input
        id={inputId}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? `${inputId}-error` : undefined}
        className={cn(
          "w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors",
          "placeholder:text-text-muted",
          "focus:border-brand-500 focus:ring-2 focus:ring-brand-100",
          error
            ? "border-[#C94343] focus:border-[#C94343] focus:ring-[#C94343]/15"
            : doubt
              ? "border-[#C6900A] bg-[#FFF4D6]/20 focus:border-[#C6900A] focus:ring-[#C6900A]/20"
              : "border-border",
          className,
        )}
        {...props}
      />
      {error ? (
        <span
          id={`${inputId}-error`}
          role="alert"
          className="flex items-start gap-2 rounded-[10px] border border-[#C94343]/25 bg-[#FDECEC] px-3 py-2 text-xs font-semibold text-[#9B2C2C]"
        >
          <span
            className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-[#C94343] text-[10px] font-black text-white"
            aria-hidden
          >
            !
          </span>
          {error}
        </span>
      ) : null}
    </label>
  );
}
