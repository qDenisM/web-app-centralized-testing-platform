"use client";

import type { ReactNode } from "react";
import { CompetitiveScoreBadge } from "@/components/layout/CompetitiveScoreBadge";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/app", label: "Главная", exact: true },
  { href: "/app/ct", label: "Мои ЦТ" },
  { href: "/app/certificate", label: "Аттестат" },
  { href: "/app/universities", label: "Университеты" },
];

type ApplicantShellProps = {
  children: ReactNode;
};

export function ApplicantShell({ children }: ApplicantShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Абитуриент"
      headerBadge={<CompetitiveScoreBadge />}
      profileLinks={[
        {
          href: "/app/profile",
          label: "Профиль и аттестат",
          icon: "profile",
        },
        {
          href: "/app/favorites",
          label: "Избранные специальности",
          icon: "favorites",
        },
      ]}
      footer={{
        roleLabel: "Абитуриенту",
        roleLinks: [
          { href: "/app", label: "Сводка" },
          { href: "/app/ct", label: "Мои ЦТ" },
          { href: "/app/certificate", label: "Аттестат" },
          { href: "/app/universities", label: "Университеты" },
          { href: "/app/profile", label: "Профиль" },
          { href: "/app/notifications", label: "Уведомления" },
        ],
        ctaTitle: "Шансы",
        ctaText: "Подберите специальности по своим баллам.",
        ctaHref: "/app/universities",
        ctaLabel: "Оценить шансы",
      }}
    >
      {children}
    </RoleShell>
  );
}
