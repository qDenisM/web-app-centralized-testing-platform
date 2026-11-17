import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: "primary" | "secondary" | "destructive";
};

const variants = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 shadow-[var(--shadow-soft)] disabled:bg-brand-500",
  secondary:
    "bg-white text-text-secondary border border-border hover:bg-[#f8fafc] hover:text-text-primary",
  destructive:
    "bg-[#c0392b] text-white hover:bg-[#a93226] shadow-[var(--shadow-soft)] disabled:opacity-70",
};

export function FormButton({
  children,
  variant = "primary",
  className,
  type = "submit",
  ...props
}: FormButtonProps) {
  // Default full width only when caller does not override width.
  const hasWidthOverride =
    typeof className === "string" &&
    /(^|\s)!?w-/.test(className);

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center rounded-[10px] px-5 py-3 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-70",
        !hasWidthOverride && "w-full",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
