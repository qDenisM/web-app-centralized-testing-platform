"use client";

import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/moderator", label: "Обзор очереди", exact: true },
  { href: "/moderator/docs", label: "Проверка данных" },
  { href: "/moderator/applications", label: "Заявки на ЦТ" },
  { href: "/moderator/history", label: "История решений" },
];

type ModeratorShellProps = {
  children: ReactNode;
};

export function ModeratorShell({ children }: ModeratorShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Модератор"
      profileLinks={[{ href: "/moderator", label: "Обзор очереди", icon: "profile" }]}
      headerBadge={
        <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
          Кампания: 2026 · Online
        </span>
      }
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
