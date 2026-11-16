"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { CabinetFooter } from "@/components/layout/CabinetFooter";
import { cn } from "@/lib/utils";

export type RoleNavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

type RoleShellProps = {
  children: ReactNode;
  navItems: RoleNavItem[];
  roleName: string;
  userShortName?: string;
  headerBadge?: ReactNode;
  sidebarFooter?: ReactNode;
  footer: {
    roleLabel: string;
    roleLinks: Array<{ href: string; label: string }>;
    ctaTitle: string;
    ctaText: string;
    ctaHref: string;
    ctaLabel: string;
  };
  showMobileNav?: boolean;
};

function isActive(pathname: string, item: RoleNavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

export function RoleShell({
  children,
  navItems,
  roleName,
  userShortName = "Пользователь",
  headerBadge,
  sidebarFooter,
  footer,
  showMobileNav = true,
}: RoleShellProps) {
  const pathname = usePathname();
  const initials = userShortName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("") || "П";

  return (
    <div className="flex min-h-full bg-bg-page">
      <aside className="hidden w-[240px] shrink-0 border-r border-border bg-white md:flex md:flex-col">
        <div className="border-b border-border px-5 py-5">
          <Logo />
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => {
            const active = isActive(pathname, item);
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
        {sidebarFooter ? (
          <div className="border-t border-border p-4 text-xs text-text-muted">
            {sidebarFooter}
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-border bg-white">
          <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
            <div className="md:hidden">
              <Logo compact />
            </div>
            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              {headerBadge}
              <NotificationsBell />
              <div className="hidden items-center gap-2 sm:flex">
                <div className="text-right">
                  <div className="text-sm font-semibold text-text-primary">
                    {userShortName}
                  </div>
                  <div className="text-xs text-text-muted">{roleName}</div>
                </div>
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-extrabold text-brand-900">
                  {initials}
                </div>
              </div>
              <LogoutButton />
            </div>
          </div>
          {showMobileNav ? (
            <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
              {navItems.map((item) => {
                const active = isActive(pathname, item);
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
          ) : null}
        </header>

        <main className="flex-1 px-4 py-6 md:px-6">{children}</main>
        <CabinetFooter {...footer} />
      </div>
    </div>
  );
}
