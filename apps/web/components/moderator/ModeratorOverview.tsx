"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ModeratorQueueResponse } from "@/lib/moderator";
type CtQueueCounts = {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function ModeratorOverview() {
  const [verifications, setVerifications] =
    useState<ModeratorQueueResponse | null>(null);
  const [ctCounts, setCtCounts] = useState<CtQueueCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [docsRes, ctRes] = await Promise.all([
          fetch("/api/applicant/moderator/verifications?status=all"),
          fetch("/api/exam/moderator/applications?status=all"),
        ]);
        const docsJson = (await docsRes.json().catch(() => null)) as
          | ModeratorQueueResponse
          | { error?: string }
          | null;
        const ctJson = (await ctRes.json().catch(() => null)) as
          | { counts: CtQueueCounts }
          | { error?: string }
          | null;

        if (!cancelled) {
          if (docsRes.ok && docsJson && "counts" in docsJson) {
            setVerifications(docsJson);
          }
          if (ctRes.ok && ctJson && "counts" in ctJson) {
            setCtCounts(ctJson.counts);
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

  const docPendingNum = verifications?.counts.pending ?? 0;
  const docReturnedNum = verifications?.counts.returned ?? 0;
  const ctPendingNum = ctCounts?.pending ?? 0;
  const ctApprovedNum = ctCounts?.approved ?? 0;

  const hotItems: Array<{
    title: string;
    detail: string;
    href: string;
    tone: "urgent" | "warn" | "neutral";
  }> = [];
  if (ctPendingNum > 0) {
    hotItems.push({
      title: "Заявки на ЦТ без решения",
      detail: `В очереди ${ctPendingNum}`,
      href: "/moderator/applications",
      tone: ctPendingNum >= 5 ? "urgent" : "warn",
    });
  }
  if (docPendingNum > 0) {
    hotItems.push({
      title: "Анкеты на проверке",
      detail: `${docPendingNum} карточек ожидают решения`,
      href: "/moderator/docs",
      tone: docPendingNum >= 5 ? "urgent" : "warn",
    });
  }
  if (docReturnedNum > 0) {
    hotItems.push({
      title: "На исправлении",
      detail: `${docReturnedNum} анкет возвращены абитуриенту`,
      href: "/moderator/docs?status=returned",
      tone: "neutral",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Оперативный обзор очередей модерации
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Сводка по проверке анкет и заявок на ЦТ в текущей кампании.
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
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-text-muted">Загрузка…</p>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard label="Анкеты на проверке" value={String(docPendingNum)} />
            <KpiCard label="На исправлении" value={String(docReturnedNum)} />
            <KpiCard label="Заявки ЦТ в очереди" value={String(ctPendingNum)} />
            <KpiCard label="Одобрено заявок ЦТ" value={String(ctApprovedNum)} />
          </section>

          <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-bold uppercase tracking-wide text-text-muted">
              Горящие дедлайны
            </h2>
            {hotItems.length === 0 ? (
              <p className="mt-4 text-sm text-text-muted">
                Срочных задач в очередях нет.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {hotItems.map((item) => (
                  <li
                    key={item.title}
                    className={`flex flex-wrap items-center justify-between gap-2 rounded-[10px] border px-4 py-3 text-sm ${
                      item.tone === "urgent"
                        ? "border-[#c94343]/30 bg-[#fdecec]"
                        : item.tone === "warn"
                          ? "border-[#C6900A]/30 bg-[#FFF4D6]"
                          : "border-border bg-[#f8fafc]"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-brand-900">{item.title}</div>
                      <div className="text-text-secondary">{item.detail}</div>
                    </div>
                    <Link
                      href={item.href}
                      className="text-sm font-bold text-brand-700 hover:underline"
                    >
                      Открыть →
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid gap-4 sm:grid-cols-2">
            <QuickLink
              href="/moderator/docs"
              title="Проверка данных абитуриентов"
              text="Очередь анкет, сверка сканов и полей."
            />
            <QuickLink
              href="/moderator/applications"
              title="Заявки на ЦТ"
              text="Одобрение записи на сеансы и пропусков."
            />
          </div>
        </>
      )}
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
      <p className="text-xs font-bold uppercase tracking-wide text-text-muted">
        {label}
      </p>
      <p className="mt-2 text-3xl font-black text-brand-900">{value}</p>
    </div>
  );
}

function QuickLink({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)] hover:border-brand-300"
    >
      <h3 className="text-base font-extrabold text-brand-900">{title}</h3>
      <p className="mt-1 text-sm text-text-secondary">{text}</p>
    </Link>
  );
}