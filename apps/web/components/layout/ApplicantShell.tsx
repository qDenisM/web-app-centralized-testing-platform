"use client";

import type { ReactNode } from "react";
import { CompetitiveScoreBadge } from "@/components/layout/CompetitiveScoreBadge";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/app", label: "Главная", exact: true, icon: "home" as const },
  { href: "/app/ct", label: "Мои ЦТ", icon: "ct" as const },
  { href: "/app/universities", label: "Университеты", icon: "universities" as const },
];

type ApplicantShellProps = {
  children: ReactNode;
};

export function ApplicantShell({ children }: ApplicantShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Абитуриент"
      homeHref="/"
      headerBadge={<CompetitiveScoreBadge />}
      profileLinks={[
        {
          href: "/app/favorites",
          label: "Избранные специальности",
          icon: "favorites",
        },
        {
          href: "/app/certificate",
          label: "Заявка на аттестат",
          icon: "certificate",
        },
        {
          href: "/app/profile",
          label: "Настройки",
          icon: "settings",
        },
      ]}
      footer={{
        roleLabel: "Абитуриенту",
        roleLinks: [
          { href: "/app", label: "Сводка" },
          { href: "/app/ct", label: "Мои ЦТ" },
          { href: "/app/universities", label: "Университеты" },
          { href: "/app/profile", label: "Настройки" },
          { href: "/app/notifications", label: "Уведомления" },
        ],
        ctaTitle: "Шансы",
        ctaText: "Подберите специальности по своим баллам.",
        ctaHref: "/app/universities",
        ctaLabel: "Оценить шансы",
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <MaintenanceBanner audience="applicant" />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </RoleShell>
  );
}
