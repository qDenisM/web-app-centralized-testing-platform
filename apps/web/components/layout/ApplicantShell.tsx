"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Главная", exact: true },
  { href: "/app/ct", label: "Мои ЦТ" },
  { href: "/app/universities", label: "Университеты" },
  { href: "/app/certificate", label: "Аттестат" },
];

type ApplicantShellProps = {
  children: ReactNode;
};

export function ApplicantShell({ children }: ApplicantShellProps) {
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
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="hidden text-sm font-semibold text-text-secondary sm:block md:ml-0">
              Кабинет абитуриента
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
                Кампания: 2026 · Online
              </span>
              <NotificationsBell />
              <span className="hidden text-sm font-medium text-text-muted sm:inline">
                Абитуриент
              </span>
              <LogoutButton />
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
            {navItems.map((item) => {
              const active = item.exact
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-[10px] px-3 py-2 text-xs font-semibold",
                    active
                      ? "bg-brand-100 text-brand-900"
                      : "text-text-secondary",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
      </div>
    </div>
  );
}
