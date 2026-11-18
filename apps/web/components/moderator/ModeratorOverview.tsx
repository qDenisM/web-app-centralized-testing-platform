"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import type { ExamApplication } from "@/lib/exam";
import {
  isResubmission,
  isSameCalendarDay,
  MODERATOR_DAILY_QUOTA,
  waitingHours,
  type ModeratorQueueResponse,
} from "@/lib/moderator";
import { Alert } from "@/components/ui/Alert";
import { KpiCard } from "@/components/ui/KpiCard";

type CtQueueResponse = {
  items: ExamApplication[];
  counts: {
    all: number;
    pending: number;
    approved: number;
    rejected: number;
  };
};

type MeUser = { id: string };

export function ModeratorOverview() {
  const [verifications, setVerifications] =
    useState<ModeratorQueueResponse | null>(null);
  const [ctQueue, setCtQueue] = useState<CtQueueResponse | null>(null);
  const [subjects, setSubjects] = useState<CatalogSubject[]>([]);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [docsRes, ctRes, subjectsRes, meRes] = await Promise.all([
          fetch("/api/applicant/moderator/verifications?status=all"),
          fetch("/api/exam/moderator/applications?status=all"),
          fetch("/api/catalog/subjects"),
          fetch("/api/users/me"),
        ]);

        const docsJson = (await docsRes.json().catch(() => null)) as
          | ModeratorQueueResponse
          | { error?: string }
          | null;
        const ctJson = (await ctRes.json().catch(() => null)) as
          | CtQueueResponse
          | { error?: string }
          | null;
        const subjectsJson = (await subjectsRes.json().catch(() => null)) as
          | CatalogSubject[]
          | { error?: string }
          | null;
        const meJson = (await meRes.json().catch(() => null)) as
          | (MeUser & { error?: string })
          | null;

        if (!cancelled) {
          if (docsRes.ok && docsJson && "counts" in docsJson) {
            setVerifications(docsJson);
          }
          if (ctRes.ok && ctJson && "counts" in ctJson) {
            setCtQueue(ctJson);
          }
          if (subjectsRes.ok && Array.isArray(subjectsJson)) {
            setSubjects(subjectsJson);
          }
          if (meRes.ok && meJson?.id) {
            setMeId(meJson.id);
          }
          if (!docsRes.ok && !ctRes.ok) {
            setError("Не удалось загрузить сводку");
          }
        }
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const items = verifications?.items ?? [];
  const pendingItems = useMemo(
    () => items.filter((item) => item.status === "pending"),
    [items],
  );
  const ctPending = useMemo(
    () => (ctQueue?.items ?? []).filter((app) => app.status === "pending"),
    [ctQueue],
  );

  const subjectNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const subject of subjects) {
      map.set(subject.id, subject.name);
    }
    return map;
  }, [subjects]);

  const approvedProfileUserIds = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.status === "approved") set.add(item.profile.userId);
    }
    return set;
  }, [items]);

  const stats = useMemo(() => {
    const pending = pendingItems.length;
    const fresh = pendingItems.filter((item) => !isResubmission(item)).length;
    const repeat = pendingItems.filter(isResubmission).length;
    const colleagues = pendingItems.filter(
      (item) => item.lockedBy && item.lockedBy !== meId,
    ).length;

    const bySubject = new Map<string, number>();
    for (const app of ctPending) {
      const subjectId = app.exam?.subjectId;
      if (!subjectId) continue;
      bySubject.set(subjectId, (bySubject.get(subjectId) || 0) + 1);
    }
    const topSubjects = [...bySubject.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([id, count]) => ({
        name: subjectNameById.get(id) || "Предмет",
        count,
      }));

    const waitingPassport = ctPending.filter(
      (app) => !approvedProfileUserIds.has(app.userId),
    ).length;

    const slaOver = pendingItems.filter(
      (item) => waitingHours(item.submittedAt) >= 48,
    );

    const decidedToday = items.filter(
      (item) =>
        item.decidedAt &&
        isSameCalendarDay(item.decidedAt) &&
        (meId ? item.lockedBy === meId : true) &&
        (item.status === "approved" ||
          item.status === "returned" ||
          item.status === "rejected"),
    );
    const approvedToday = decidedToday.filter(
      (item) => item.status === "approved",
    ).length;
    const returnedToday = decidedToday.filter(
      (item) => item.status === "returned",
    ).length;
    const rejectedToday = decidedToday.filter(
      (item) => item.status === "rejected",
    ).length;
    const quotaPct = Math.min(
      100,
      Math.round((decidedToday.length / MODERATOR_DAILY_QUOTA) * 100),
    );

    return {
      pending,
      fresh,
      repeat,
      colleagues,
      ctPending: ctPending.length,
      topSubjects,
      waitingPassport,
      slaOver,
      decidedToday: decidedToday.length,
      approvedToday,
      returnedToday,
      rejectedToday,
      quotaPct,
    };
  }, [
    pendingItems,
    meId,
    ctPending,
    subjectNameById,
    approvedProfileUserIds,
    items,
  ]);

  const burningAlerts = useMemo(() => {
    const alerts: Array<{
      key: string;
      text: string;
      href: string;
      action: string;
    }> = [];

    const nearestBySubject = new Map<
      string,
      { startsAt: string; count: number; name: string }
    >();
    for (const app of ctPending) {
      const exam = app.exam;
      if (!exam?.startsAt || !exam.subjectId) continue;
      const name =
        subjectNameById.get(exam.subjectId) || "экзамен";
      const prev = nearestBySubject.get(exam.subjectId);
      if (!prev) {
        nearestBySubject.set(exam.subjectId, {
          startsAt: exam.startsAt,
          count: 1,
          name,
        });
        continue;
      }
      nearestBySubject.set(exam.subjectId, {
        startsAt:
          new Date(exam.startsAt) < new Date(prev.startsAt)
            ? exam.startsAt
            : prev.startsAt,
        count: prev.count + 1,
        name: prev.name,
      });
    }

    const soon = [...nearestBySubject.values()]
      .map((row) => {
        const ms = new Date(row.startsAt).getTime() - Date.now();
        const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
        return { ...row, days };
      })
      .filter((row) => row.days >= 0 && row.days <= 7)
      .sort((a, b) => a.days - b.days);

    if (soon[0]) {
      const row = soon[0];
      const when =
        row.days === 0
          ? "сегодня"
          : row.days === 1
            ? "через 1 день"
            : row.days >= 2 && row.days <= 4
              ? `через ${row.days} дня`
              : `через ${row.days} дней`;
      alerts.push({
        key: "exam-deadline",
        text: `Запись на «${row.name}» закрывается ${when}. В очереди ${row.count} заявок. Без модерации абитуриенты не смогут получить пропуск.`,
        href: "/moderator/applications?status=pending",
        action: `Рассмотреть ${row.count}`,
      });
    }

    const resubmits = pendingItems.filter(isResubmission);
    if (resubmits.length > 0) {
      alerts.push({
        key: "resubmit",
        text: `${resubmits.length} повторных отправок документов после исправления. Абитуриенты заменили сканы аттестатов и паспортные данные.`,
        href: "/moderator/docs?filter=resubmit",
        action: `В очередь (${resubmits.length})`,
      });
    }

    if (stats.slaOver.length > 0 && alerts.length < 2) {
      alerts.push({
        key: "sla",
        text: `${stats.slaOver.length} анкет ожидают дольше 2 суток. Требуют первоочередной верификации данных.`,
        href: "/moderator/docs?status=pending",
        action: `Проверить ${stats.slaOver.length}`,
      });
    }

    return alerts;
  }, [ctPending, subjectNameById, pendingItems, stats.slaOver.length]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Оперативный обзор очередей модерации
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            Контроль паспортов, документов об образовании и одобрения заявок на
            ЦТ.
          </p>
        </div>
        <Link
          href="/moderator/docs"
          className="inline-flex items-center justify-center rounded-[10px] bg-brand-700 px-5 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-brand-800"
        >
          Начать проверку данных
        </Link>
      </div>

      {error ? (
        <Alert>{error}</Alert>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Данные на проверке"
              value={stats.pending}
              detail={`Новые: ${stats.fresh} • Повторные: ${stats.repeat}`}
              footer={`${stats.colleagues} в работе коллегами`}
            />
            <KpiCard
              label="Заявки на рассмотрении"
              value={stats.ctPending}
              detail={
                stats.topSubjects.length > 0
                  ? stats.topSubjects
                      .map((row) => `${row.name}: ${row.count}`)
                      .join(" • ")
                  : "Нет разбивки по предметам"
              }
              footer={`${stats.waitingPassport} ждут подтверждения паспорта`}
            />
            <KpiCard
              label="Ожидают дольше 2 суток"
              value={stats.slaOver.length}
              detail="Превышение SLA проверки данных"
              footer="Требуют первоочередной верификации"
              footerTone="warn"
            />
            <KpiCard
              label="Решено мной сегодня"
              value={stats.decidedToday}
              detail={`Одобрено: ${stats.approvedToday} • Исправления: ${stats.returnedToday} • Отказ: ${stats.rejectedToday}`}
              footer={`Норматив выполнен на ${stats.quotaPct}%`}
            />
          </section>

          <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
                Горящие дедлайны экзаменов
              </h2>
              {burningAlerts.length > 0 ? (
                <span className="rounded-full bg-[#FFF4D6] px-2.5 py-0.5 text-xs font-bold text-[#9A6B00]">
                  Внимание
                </span>
              ) : null}
            </div>

            {burningAlerts.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Нет срочных дедлайнов — очереди в пределах нормы.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {burningAlerts.map((alert) => (
                  <li
                    key={alert.key}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#C6900A]/30 bg-[#FFF4D6] px-4 py-3 text-sm"
                  >
                    <p className="max-w-3xl text-text-primary">{alert.text}</p>
                    <Link
                      href={alert.href}
                      className="inline-flex shrink-0 rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-brand-800 hover:bg-[#f8fafc]"
                    >
                      {alert.action}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}

