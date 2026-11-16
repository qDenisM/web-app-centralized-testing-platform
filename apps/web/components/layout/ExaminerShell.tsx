"use client";

import type { ReactNode } from "react";
import { RoleShell } from "@/components/layout/RoleShell";

const navItems = [
  { href: "/examiner", label: "Результаты ЦТ", exact: true, icon: "results" as const },
  { href: "/examiner/exams", label: "Экзамены ЦТ", icon: "exams" as const },
  { href: "/examiner/applicants", label: "Абитуриенты", icon: "applicants" as const },
  { href: "/examiner/import", label: "Импорт результатов", icon: "import" as const },
];

type ExaminerShellProps = {
  children: ReactNode;
};

export function ExaminerShell({ children }: ExaminerShellProps) {
  return (
    <RoleShell
      navItems={navItems}
      roleName="Экзаменатор"
      homeHref="/examiner"
      profileLinks={[{ href: "/examiner", label: "Результаты ЦТ", icon: "profile" }]}
      headerBadge={
        <span className="hidden rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-900 sm:inline">
          Кампания: 2026 · Online
        </span>
      }
      sidebarFooter={
        <div className="space-y-1">
          <div className="text-[10px] font-extrabold uppercase tracking-wide text-brand-900">
            Режим комиссии
          </div>
          <div className="font-semibold text-emerald-700">Онлайн</div>
          <div>Полный реестр ЦТ</div>
        </div>
      }
      footer={{
        roleLabel: "Экзаменатору",
        roleLinks: [
          { href: "/examiner", label: "Результаты ЦТ" },
          { href: "/examiner/exams", label: "Экзамены ЦТ" },
          { href: "/examiner/applicants", label: "Абитуриенты" },
          { href: "/examiner/import", label: "Импорт результатов" },
        ],
        ctaTitle: "Результаты ЦТ",
        ctaText: "Внесите баллы и опубликуйте ведомость.",
        ctaHref: "/examiner",
        ctaLabel: "Внести результаты",
      }}
    >
      {children}
    </RoleShell>
  );
}
