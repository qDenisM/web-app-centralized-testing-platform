"use client";

import { useMemo, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";

type PreviewRow = {
  pass: string;
  subject: string;
  score: string;
  date: string;
};

function parseCsv(text: string): PreviewRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: PreviewRow[] = [];
  for (const line of lines.slice(1)) {
    const parts = line.split(/[,;]/).map((p) => p.trim().replace(/^"|"$/g, ""));
    if (parts.length < 3) continue;
    rows.push({
      pass: parts[0] || "—",
      subject: parts[1] || "—",
      score: parts[2] || "—",
      date: parts[3] || "—",
    });
  }
  return rows;
}

export function ResultsImport() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validCount = useMemo(
    () => preview.filter((r) => r.score !== "—" && !Number.isNaN(Number(r.score))).length,
    [preview],
  );

  function handleFile(file: File) {
    setImportMsg(null);
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setPreview(parseCsv(text));
    };
    reader.readAsText(file, "utf-8");
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Импорт результатов ЦТ
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Загрузите CSV с колонками: пропуск, предмет, балл, дата (опционально).
        </p>
      </div>

      <div>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const file = e.dataTransfer.files[0];
            if (file) handleFile(file);
          }}
          className={`flex min-h-[160px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-10 text-center ${
            dragOver ? "border-brand-500 bg-brand-50" : "border-border bg-white"
          }`}
        >
          <p className="text-sm font-semibold text-text-primary">
            Перетащите CSV-файл сюда
          </p>
          <p className="mt-1 text-xs text-text-muted">или выберите с диска</p>
          <label className="mt-4 cursor-pointer">
            <span className="rounded-[10px] bg-brand-700 px-4 py-2 text-sm font-bold text-white">
              Выбрать файл
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
          </label>
          {fileName ? (
            <p className="mt-3 text-xs text-text-secondary">Файл: {fileName}</p>
          ) : null}
        </div>
      </div>

      {preview.length > 0 ? (
        <div className="overflow-x-auto rounded-[14px] border border-border bg-white shadow-[var(--shadow-soft)]">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3">Пропуск</th>
                <th className="px-4 py-3">Предмет</th>
                <th className="px-4 py-3">Балл</th>
                <th className="px-4 py-3">Дата</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={`${row.pass}-${i}`} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3">{row.pass}</td>
                  <td className="px-4 py-3">{row.subject}</td>
                  <td className="px-4 py-3 font-bold tabular-nums">{row.score}</td>
                  <td className="px-4 py-3 text-text-secondary">{row.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <FormButton
          type="button"
          className="w-auto px-5 py-2.5"
          disabled={validCount === 0}
          onClick={() => {
            setImportMsg(
              `Импорт пока не подключён к API. Готово к загрузке: ${validCount} строк (заглушка).`,
            );
          }}
        >
          Импортировать в реестр
        </FormButton>
        {importMsg ? (
          <p className="text-sm text-text-secondary">{importMsg}</p>
        ) : null}
      </div>
    </div>
  );
}