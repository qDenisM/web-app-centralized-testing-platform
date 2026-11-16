"use client";

import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/app", label: "Главная", exact: true },
  { href: "/app/ct", label: "Мои ЦТ" },
  { href: "/app/certificate", label: "Аттестат" },
  { href: "/app/universities", label: "Университеты" },
];

type ApplicantShellProps = {
  children: ReactNode;
  competitiveScore?: number | null;
};

export function ApplicantShell({
  children,
  competitiveScore = null,
}: ApplicantShellProps) {
  const scoreLabel =
    competitiveScore == null ? "—" : String(Math.round(competitiveScore));

  return (
    <RoleShell
      navItems={navItems}
      roleName="Абитуриент"
      userShortName="Абитуриент"
      headerBadge={
        <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
          Конкурсный балл: {scoreLabel} / 400
        </span>
      }
      footer={{
        roleLabel: "Абитуриенту",
        roleLinks: [
          { href: "/app", label: "Сводка" },
          { href: "/app/ct", label: "Мои ЦТ" },
          { href: "/app/certificate", label: "Аттестат" },
          { href: "/app/universities", label: "Университеты" },
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
