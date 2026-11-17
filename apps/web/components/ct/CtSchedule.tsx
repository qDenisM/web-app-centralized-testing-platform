"use client";

import { useMemo, useState } from "react";
import type { ExamApplication } from "@/lib/exam";
import type { CtResult } from "@/lib/results";
import { cn } from "@/lib/utils";

type DayMark = "scored" | "review" | "registered";

type CtScheduleProps = {
  applications: ExamApplication[];
  resultsByExamId: Map<string, CtResult>;
  subjectName: (subjectId: string) => string;
  busyId: string | null;
  onDownloadPass: (applicationId: string) => void;
  onCancel: (applicationId: string) => void;
};

const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] as const;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function examEnd(startsAt: string, duration: number): Date {
  return new Date(new Date(startsAt).getTime() + duration * 60_000);
}

function pluralDays(n: number): string {
  const abs = Math.abs(n) % 100;
  const d = abs % 10;
  if (abs > 10 && abs < 20) return "дней";
  if (d === 1) return "день";
  if (d >= 2 && d <= 4) return "дня";
  return "дней";
}

function formatRange(startsAt: string, duration: number): string {
  const start = new Date(startsAt);
  const end = examEnd(startsAt, duration);
  const datePart = start.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const t1 = start.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  const t2 = end.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${datePart}, ${t1} – ${t2}`;
}

function cardBadge(
  app: ExamApplication,
  result: CtResult | undefined,
  now: Date,
): { text: string; className: string } {
  // Application moderation first — not the same as RIKZ score review.
  if (app.status === "pending") {
    return {
      text: "На модерации",
      className: "bg-[#FFF4D6] text-[#9A6B00]",
    };
  }

  if (result?.status === "published") {
    return {
      text: "Завершено",
      className: "bg-[#E4F6EC] text-[#176B45]",
    };
  }

  if (!app.exam) {
    return {
      text: "Вы записаны",
      className: "bg-[#E4F6EC] text-[#176B45]",
    };
  }

  const start = new Date(app.exam.startsAt);
  const end = examEnd(app.exam.startsAt, app.exam.duration);

  // After the exam: waiting for RIKZ / published scores (not registration status).
  if (end.getTime() < now.getTime()) {
    return {
      text: "Ожидание баллов",
      className: "bg-[#FFF4D6] text-[#9A6B00]",
    };
  }

  const days = Math.ceil(
    (startOfDay(start).getTime() - startOfDay(now).getTime()) / 86_400_000,
  );
  if (days <= 0) {
    return {
      text: "Сегодня",
      className: "bg-[#E7F0F8] text-[#2F6FAE]",
    };
  }
  return {
    text: `Через ${days} ${pluralDays(days)}`,
    className: "bg-[#E7F0F8] text-[#2F6FAE]",
  };
}

function dayMarkForApps(
  apps: ExamApplication[],
  resultsByExamId: Map<string, CtResult>,
  now: Date,
): DayMark | null {
  if (apps.length === 0) return null;
    let hasRegistered = false;
    let hasReview = false;
    for (const app of apps) {
      if (!app.exam) continue;
      const result = resultsByExamId.get(app.examId);
      if (result?.status === "published") return "scored";
      // Yellow: moderation or waiting for scores after the exam.
      if (app.status === "pending") {
        hasReview = true;
        continue;
      }
      const end = examEnd(app.exam.startsAt, app.exam.duration);
      if (end.getTime() < now.getTime()) hasReview = true;
      else hasRegistered = true;
    }
    if (hasReview) return "review";
    if (hasRegistered) return "registered";
    return null;
  }

function PrinterIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <path d="M6 9V3h12v6" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 13h12v8H6v-8Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={className}
      aria-hidden
    >
      <path
        d="M12 21s7-5.2 7-11a7 7 0 1 0-14 0c0 5.8 7 11 7 11Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

export function CtSchedule({
  applications,
  resultsByExamId,
  subjectName,
  busyId,
  onDownloadPass,
  onCancel,
}: CtScheduleProps) {
  const now = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => {
    const first = applications.find((a) => a.exam?.startsAt)?.exam?.startsAt;
    const base = first ? new Date(first) : now;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const appsByDayKey = useMemo(() => {
    const map = new Map<string, ExamApplication[]>();
    for (const app of applications) {
      if (!app.exam?.startsAt) continue;
      const d = new Date(app.exam.startsAt);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const list = map.get(key) || [];
      list.push(app);
      map.set(key, list);
    }
    return map;
  }, [applications]);

  const calendarCells = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const first = new Date(year, month, 1);
    // Monday-first: JS Sunday=0 → shift
    const startPad = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{
      date: Date | null;
      mark: DayMark | null;
      isToday: boolean;
    }> = [];

    for (let i = 0; i < startPad; i++) {
      cells.push({ date: null, mark: null, isToday: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const key = `${year}-${month}-${day}`;
      const apps = appsByDayKey.get(key) || [];
      cells.push({
        date,
        mark: dayMarkForApps(apps, resultsByExamId, now),
        isToday: sameDay(date, now),
      });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ date: null, mark: null, isToday: false });
    }
    return cells;
  }, [cursor, appsByDayKey, resultsByExamId, now]);

  const visibleApps = useMemo(() => {
    if (!selectedDay) return applications;
    return applications.filter((app) => {
      if (!app.exam?.startsAt) return false;
      return sameDay(new Date(app.exam.startsAt), selectedDay);
    });
  }, [applications, selectedDay]);

  const monthLabel = cursor.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-extrabold text-brand-900">
        Расписание ваших ЦТ
      </h2>

      {applications.length === 0 ? (
        <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
          Пока нет активных записей. Запишитесь на вкладке «Запись на ЦТ».
        </p>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)]">
          <aside className="rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                aria-label="Предыдущий месяц"
                onClick={() =>
                  setCursor(
                    (d) => new Date(d.getFullYear(), d.getMonth() - 1, 1),
                  )
                }
                className="rounded-[8px] px-2 py-1 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9]"
              >
                ‹
              </button>
              <p className="text-sm font-extrabold capitalize text-brand-900">
                {monthLabel}
              </p>
              <button
                type="button"
                aria-label="Следующий месяц"
                onClick={() =>
                  setCursor(
                    (d) => new Date(d.getFullYear(), d.getMonth() + 1, 1),
                  )
                }
                className="rounded-[8px] px-2 py-1 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9]"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-text-muted">
              {WEEKDAYS.map((d) => (
                <span key={d} className="py-1">
                  {d}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell.date) {
                  return <span key={`e-${idx}`} className="h-9" />;
                }
                const selected =
                  selectedDay !== null && sameDay(cell.date, selectedDay);
                const markClass =
                  cell.mark === "scored"
                    ? "bg-[#176B45] text-white"
                    : cell.mark === "review"
                      ? "bg-[#C6900A] text-white"
                      : cell.mark === "registered"
                        ? "bg-[#2F6FAE] text-white"
                        : "text-brand-900 hover:bg-[#f4f7f9]";

                return (
                  <button
                    key={cell.date.toISOString()}
                    type="button"
                    onClick={() =>
                      setSelectedDay((prev) =>
                        prev && sameDay(prev, cell.date!)
                          ? null
                          : cell.date,
                      )
                    }
                    className={cn(
                      "relative flex h-9 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                      markClass,
                      cell.isToday && !cell.mark
                        ? "ring-2 ring-[#2F6FAE] ring-offset-1"
                        : null,
                      cell.isToday && cell.mark
                        ? "ring-2 ring-white ring-offset-2 ring-offset-[#2F6FAE]"
                        : null,
                      selected ? "outline outline-2 outline-brand-700" : null,
                    )}
                  >
                    {cell.date.getDate()}
                  </button>
                );
              })}
            </div>

            <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-text-secondary">
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#176B45]" />
                Получены баллы
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#C6900A]" />
                На модерации / ожидание баллов
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border-2 border-[#2F6FAE] bg-white" />
                Текущий день
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#2F6FAE]" />
                Записан
              </li>
            </ul>
          </aside>

          <div className="space-y-3">
            {visibleApps.length === 0 ? (
              <p className="rounded-[14px] border border-border bg-white p-5 text-sm text-text-secondary shadow-[var(--shadow-soft)]">
                На выбранный день записей нет.
              </p>
            ) : (
              visibleApps.map((app) => {
                const result = resultsByExamId.get(app.examId);
                const badge = cardBadge(app, result, now);
                const venueLabel =
                  [app.exam?.venue?.name, app.exam?.venue?.address]
                    .filter(Boolean)
                    .join(", ") || "Пункт ЦТ";

                return (
                  <article
                    key={app.id}
                    className="flex flex-wrap items-stretch justify-between gap-4 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)] sm:flex-nowrap"
                  >
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-extrabold text-brand-900">
                          {app.exam
                            ? subjectName(app.exam.subjectId)
                            : "Предмет"}
                        </h3>
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-bold",
                            badge.className,
                          )}
                        >
                          {badge.text}
                        </span>
                      </div>

                      {app.exam ? (
                        <p className="flex items-start gap-2 text-sm text-text-secondary">
                          <ClockIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                          <span>
                            {formatRange(app.exam.startsAt, app.exam.duration)}
                          </span>
                        </p>
                      ) : null}

                      <p className="flex items-start gap-2 text-sm text-text-secondary">
                        <PinIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" />
                        <span>{venueLabel}</span>
                      </p>

                      <p className="text-sm font-semibold text-brand-800">
                        Пропуск №{" "}
                        {app.passNumber || "будет после одобрения"}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center">
                      {app.status === "approved" ? (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => onDownloadPass(app.id)}
                          className="inline-flex items-center gap-2 rounded-[10px] border border-border bg-white px-3.5 py-2 text-sm font-bold text-brand-800 hover:bg-[#f4f7f9] disabled:opacity-60"
                        >
                          <PrinterIcon className="h-4 w-4" />
                          Пропуск
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === app.id}
                          onClick={() => onCancel(app.id)}
                          className="rounded-[10px] px-3.5 py-2 text-sm font-bold text-[#c94343] hover:bg-[#fdecec] disabled:opacity-60"
                        >
                          Отменить
                        </button>
                      )}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
