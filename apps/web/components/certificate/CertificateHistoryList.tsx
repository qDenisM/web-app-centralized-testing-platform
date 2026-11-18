"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  formatVerificationDate,
  verificationStatusBadgeClass,
  verificationStatusLabel,
  verificationVersionLabel,
  type VerificationHistoryItem,
  type VerificationHistoryList,
} from "@/lib/applicant";
import { Alert } from "@/components/ui/Alert";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function CertificateHistoryList() {
  const [items, setItems] = useState<VerificationHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/applicant/verifications");
        const data = (await res.json().catch(() => ({}))) as VerificationHistoryList & {
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) {
          setError(data.error || "Не удалось загрузить заявки");
          return;
        }
        setItems(data.items || []);
      } catch {
        if (!cancelled) setError("Сеть недоступна");
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Заявки на аттестат
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          История отправок и статусов. Отправить или изменить заявку можно в
          разделе{" "}
          <Link
            href="/app/certificate"
            className="font-bold text-brand-700 hover:underline"
          >
            Аттестат
          </Link>
          .
        </p>
      </div>

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}

      {items.length === 0 ? (
        <EmptyState className="space-y-3 border-solid p-6 text-left text-text-secondary shadow-[var(--shadow-soft)]">
          Пока нет заявок. Создайте и отправьте аттестат через боковое меню.
          <Link
            href="/app/certificate"
            className="mt-3 block text-sm font-bold text-brand-700 hover:underline"
          >
            Перейти к отправке →
          </Link>
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <ul className="divide-y divide-border">
            {items.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/app/certificate/history/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-[#f4f7f9] sm:px-5"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-extrabold text-brand-900">
                        {verificationVersionLabel(item.version)}
                      </span>
                      <StatusBadge
                        className={verificationStatusBadgeClass(item.status)}
                      >
                        {verificationStatusLabel(item.status)}
                      </StatusBadge>
                    </div>
                    <p className="text-xs text-text-muted">
                      Отправлено: {formatVerificationDate(item.submittedAt)}
                      {item.decidedAt
                        ? ` · Решение: ${formatVerificationDate(item.decidedAt)}`
                        : ""}
                    </p>
                    {item.rejectReason &&
                    (item.status === "rejected" ||
                      item.status === "returned") ? (
                      <p className="line-clamp-2 whitespace-pre-line text-xs text-text-secondary">
                        {item.status === "returned"
                          ? "Что исправить: "
                          : "Причина отказа: "}
                        {item.rejectReason}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-sm font-bold text-brand-700">
                    Открыть →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
