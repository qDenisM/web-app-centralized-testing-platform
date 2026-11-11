import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary";
};

const variants = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 shadow-[var(--shadow-soft)] disabled:bg-brand-500",
  secondary:
    "bg-white text-text-secondary border border-border hover:bg-[#f8fafc] hover:text-text-primary",
};

export function FormButton({
  children,
  variant = "primary",
  className,
  type = "submit",
  ...props
}: FormButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex w-full items-center justify-center rounded-[10px] px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
