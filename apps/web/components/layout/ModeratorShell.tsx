"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/moderator", label: "Проверка данных", exact: true },
  { href: "/moderator/history", label: "История решений" },
];

type ModeratorShellProps = {
  children: ReactNode;
};

export function ModeratorShell({ children }: ModeratorShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full bg-bg-page">
      <aside className="hidden w-[240px] shrink-0 border-r border-border bg-white md:flex md:flex-col">
        <div className="border-b border-border px-5 py-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-brand-100 text-brand-900"
                    : "text-text-secondary hover:bg-[#f4f7f9] hover:text-text-primary",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 text-xs text-text-muted">
          Норматив проверки: ≤ 48 часов
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="hidden text-sm font-semibold text-text-secondary sm:block">
              Кабинет модератора
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden text-sm font-medium text-text-muted sm:inline">
                Модератор
              </span>
              <LogoutButton />
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
