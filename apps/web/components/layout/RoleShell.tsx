"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { NotificationsBell } from "@/components/notifications/NotificationsBell";
import { CabinetFooter } from "@/components/layout/CabinetFooter";
import {
  ProfileMenu,
  type ProfileMenuLink,
} from "@/components/layout/ProfileMenu";
import { NavIcon, type NavIconName } from "@/components/icons/NavIcons";
import { cn } from "@/lib/utils";

export type RoleNavItem = {
  href: string;
  label: string;
  exact?: boolean;
  icon?: NavIconName;
};

type RoleShellProps = {
  children: ReactNode;
  navItems: RoleNavItem[];
  roleName: string;
  homeHref: string;
  headerBadge?: ReactNode;
  sidebarFooter?: ReactNode;
  profileLinks?: ProfileMenuLink[];
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

const shellContainer =
  "mx-auto flex w-full max-w-[1280px] px-4 md:px-8";

export function RoleShell({
  children,
  navItems,
  roleName,
  homeHref,
  headerBadge,
  sidebarFooter,
  profileLinks = [],
  footer,
  showMobileNav = true,
}: RoleShellProps) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full min-w-[1024px] flex-col bg-bg-page">
      <header className="border-b border-border bg-white">
        <div className={cn(shellContainer, "h-16 items-center justify-between gap-3")}>
          <Logo href={homeHref} />
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {headerBadge}
            <NotificationsBell />
            <ProfileMenu roleName={roleName} links={profileLinks} />
          </div>
        </div>
        {showMobileNav ? (
          <nav
            className={cn(
              shellContainer,
              "gap-1 overflow-x-auto border-t border-border py-2 lg:hidden",
            )}
          >
            {navItems.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-semibold",
                    active
                      ? "bg-brand-100 text-brand-900"
                      : "text-text-secondary",
                  )}
                >
                  {item.icon ? (
                    <NavIcon name={item.icon} className="h-3.5 w-3.5" />
                  ) : null}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <div className={cn(shellContainer, "min-h-0 flex-1 gap-0")}>
          <aside className="hidden w-[240px] shrink-0 flex-col border-r border-border bg-white lg:flex">
            <nav className="flex flex-1 flex-col gap-1 p-3">
              {navItems.map((item) => {
                const active = isActive(pathname, item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5 text-sm font-semibold transition-colors",
                      active
                        ? "bg-brand-100 text-brand-900"
                        : "text-text-secondary hover:bg-[#f4f7f9] hover:text-text-primary",
                    )}
                  >
                    {item.icon ? <NavIcon name={item.icon} /> : null}
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

          <main className="min-w-0 flex-1 overflow-x-auto py-6 md:py-8 md:pl-8">
            {children}
          </main>
        </div>
      </div>

      <CabinetFooter {...footer} />
    </div>
  );
}
