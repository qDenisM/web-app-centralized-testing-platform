"use client";

import type { ReactNode } from "react";
import { ActiveCampaignBadge } from "@/components/layout/ActiveCampaignBadge";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/admin", label: "Обзор", exact: true, icon: "overview" as const },
  { href: "/admin/users", label: "Пользователи", icon: "users" as const },
  { href: "/admin/campaign", label: "Приёмная кампания", icon: "campaign" as const },
  {
    href: "/admin/universities",
    label: "Вузы и колледжи",
    icon: "universities" as const,
    section: "Справочники РБ",
  },
  { href: "/admin/specialties", label: "Специальности", icon: "specialty" as const },
  { href: "/admin/subjects", label: "Предметы ЦТ", icon: "subject" as const },
];

type AdminShellProps = {
  children: ReactNode;
};

export function AdminShell({ children }: AdminShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Администратор"
      homeHref="/admin"
      profileLinks={[{ href: "/admin", label: "Обзор системы", icon: "profile" }]}
      headerBadge={<ActiveCampaignBadge />}
      sidebarFooter={
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-900">
            Режим данных
          </div>
          <div className="font-semibold text-text-primary">Продакшн</div>
          <div className="text-[10px] text-text-muted">Кэш обновлён недавно</div>
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
