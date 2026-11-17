"use client";

import type { ReactNode } from "react";
import { ActiveCampaignBadge } from "@/components/layout/ActiveCampaignBadge";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/moderator", label: "Обзор очереди", exact: true, icon: "queue" as const },
  { href: "/moderator/docs", label: "Проверка данных", icon: "docs" as const },
  { href: "/moderator/applications", label: "Заявки на ЦТ", icon: "applications" as const },
  { href: "/moderator/history", label: "История решений", icon: "history" as const },
];

type ModeratorShellProps = {
  children: ReactNode;
};

export function ModeratorShell({ children }: ModeratorShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Модератор"
      homeHref="/"
      profileLinks={[
        { href: "/moderator", label: "Обзор очереди", icon: "profile" },
        { href: "/moderator/settings", label: "Настройки", icon: "settings" },
      ]}
      headerBadge={<ActiveCampaignBadge />}
      sidebarFooter={
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-900">
            Норматив проверки
          </div>
          <div className="text-sm font-bold text-text-primary">≤ 48 часов</div>
          <div>Решено сегодня: —</div>
        </div>
      }
      footer={{
        roleLabel: "Модератору",
        roleLinks: [
          { href: "/moderator", label: "Обзор очереди" },
          { href: "/moderator/docs", label: "Проверка данных" },
          { href: "/moderator/applications", label: "Заявки на ЦТ" },
          { href: "/moderator/history", label: "История решений" },
        ],
        ctaTitle: "Очередь",
        ctaText: "Перейти к проверке персональных данных.",
        ctaHref: "/moderator/docs",
        ctaLabel: "Начать проверку",
      }}
    >
      {children}
    </RoleShell>
  );
}
