"use client";

import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/admin", label: "Обзор", exact: true },
  { href: "/admin/users", label: "Пользователи" },
  { href: "/admin/campaign", label: "Приёмная кампания" },
  { href: "/admin/universities", label: "Вузы и колледжи" },
  { href: "/admin/specialties", label: "Специальности" },
  { href: "/admin/subjects", label: "Предметы ЦТ" },
];

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Администратор"
      profileLinks={[{ href: "/admin", label: "Обзор системы", icon: "profile" }]}
      headerBadge={
        <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
          Кампания: 2026 · Online
        </span>
      }
      sidebarFooter={
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-900">
            Режим данных
          </div>
          <div className="font-semibold text-text-primary">Продакшн</div>
        </div>
      }
      footer={{
        roleLabel: "Администратору",
        roleLinks: [
          { href: "/admin", label: "Обзор" },
          { href: "/admin/users", label: "Пользователи" },
          { href: "/admin/campaign", label: "Приёмная кампания" },
          { href: "/admin/universities", label: "Вузы и колледжи" },
        ],
        ctaTitle: "Справочники",
        ctaText: "Управляйте вузами, специальностями и предметами ЦТ.",
        ctaHref: "/admin/universities",
        ctaLabel: "Открыть справочники",
      }}
    >
      {children}
    </RoleShell>
  );
}
