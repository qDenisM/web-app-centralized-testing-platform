import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  className?: string;
};

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-700 text-white hover:bg-brand-800 shadow-[var(--shadow-soft)]",
  secondary:
    "bg-white text-text-secondary border border-border hover:bg-[#f8fafc] hover:text-text-primary",
};

export function Button({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonProps) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center rounded-[10px] px-5 py-2.5 text-sm font-bold transition-colors ${variants[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}
