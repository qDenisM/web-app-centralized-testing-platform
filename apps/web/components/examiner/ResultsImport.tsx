"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CatalogSubject } from "@/lib/catalog";
import type { ExamApplication, ExamSession } from "@/lib/exam";
import {
  shortUserId,
  type CtResult,
  type ExaminerResultsResponse,
} from "@/lib/results";
import { cn } from "@/lib/utils";
import { FormButton } from "@/components/ui/FormButton";
import { Alert } from "@/components/ui/Alert";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const ACCEPTED_EXT = [".csv", ".xlsx", ".xls"] as const;

type ResultsImportProps = {
  subjects: CatalogSubject[];
};

type ParsedRow = {
  pass: string;
  fio: string;
  subject: string;
  score: string;
  date: string;
};

type PreviewRow = ParsedRow & {
  index: number;
  ok: boolean;
  statusText: string;
  resultId: string | null;
  scoreNum: number | null;
};

function UploadIcon() {
  return (
    <span
      className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-brand-700 text-white shadow-[var(--shadow-soft)]"
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 18h14"
        />
      </svg>
    </span>
  );
}

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, " ");
}

function headerKey(header: string): keyof ParsedRow | null {
  const h = normalizeHeader(header);
  if (
    h === "пропуск" ||
    h === "номер пропуска" ||
    h === "pass" ||
    h === "pass number" ||
    h.includes("пропуск")
  ) {
    return "pass";
  }
  if (h === "фио" || h === "fio" || h === "ф.и.о." || h.includes("фио") || h === "name") {
    return "fio";
  }
  if (h === "предмет" || h === "subject" || h.includes("предмет")) {
    return "subject";
  }
  if (h === "балл" || h === "score" || h.includes("балл")) {
    return "score";
  }
  if (h === "дата" || h === "date" || h.includes("дата")) {
    return "date";
  }
  return null;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current.trim());
  return parts.map((p) => p.replace(/^"|"$/g, "").trim());
}

function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;
  return semi >= comma ? ";" : ",";
}

function parseCsv(text: string): ParsedRow[] {
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return [];

  const delimiter = detectDelimiter(lines[0]);
  const headers = splitCsvLine(lines[0], delimiter).map(headerKey);
  const hasMappedHeader = headers.some((h) => h !== null);

  const rows: ParsedRow[] = [];
  const start = hasMappedHeader ? 1 : 0;

  for (const line of lines.slice(start)) {
    const parts = splitCsvLine(line, delimiter);
    if (parts.every((p) => !p)) continue;

    const row: ParsedRow = { pass: "", fio: "", subject: "", score: "", date: "" };

    if (hasMappedHeader) {
      headers.forEach((key, i) => {
        if (key) row[key] = parts[i] || "";
      });
    } else if (
      parts.length >= 4 &&
      Number.isNaN(Number(parts[1])) &&
      !Number.isNaN(Number(parts[3]))
    ) {
      // пропуск, ФИО, предмет, балл [, дата]
      row.pass = parts[0] || "";
      row.fio = parts[1] || "";
      row.subject = parts[2] || "";
      row.score = parts[3] || "";
      row.date = parts[4] || "";
    } else {
      // legacy: пропуск, предмет, балл [, дата]
      row.pass = parts[0] || "";
      row.subject = parts[1] || "";
      row.score = parts[2] || "";
      row.date = parts[3] || "";
    }

    if (!row.pass && !row.score && !row.subject) continue;
    rows.push(row);
  }

  return rows;
}

function fileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
}

function isExcelExt(ext: string): boolean {
  return ext === ".xlsx" || ext === ".xls";
}

function downloadTemplate() {
  const header = "номер пропуска;ФИО;предмет;балл";
  const example = [
    "CT-2026-0001;Иванов Иван Иванович;Математика;87",
    "CT-2026-0002;Петрова Анна Сергеевна;Русский язык;92",
  ];
  const csv = `\uFEFF${[header, ...example].join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "shablon-vedomost-ct.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function normalizePass(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function normalizeSubject(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function buildPreview(
  parsed: ParsedRow[],
  apps: ExamApplication[],
  rows: CtResult[],
  examMap: Map<string, ExamSession>,
  subjectName: (id: string) => string,
): PreviewRow[] {
  const byPass = new Map<string, ExamApplication>();
  for (const app of apps) {
    if (!app.passNumber) continue;
    byPass.set(normalizePass(app.passNumber), app);
  }

  const resultByUserExam = new Map<string, CtResult>();
  for (const row of rows) {
    resultByUserExam.set(`${row.userId}:${row.examId}`, row);
  }

  return parsed.map((row, i): PreviewRow => {
    const index = i + 1;
    const pass = row.pass.trim();
    const scoreRaw = row.score.trim();
    const fio = row.fio.trim() || (pass ? `Участник ${shortUserId(pass)}` : "—");
    const subjectLabel = row.subject.trim() || "—";

    if (!pass) {
      return {
        ...row,
        pass: "—",
        fio,
        subject: subjectLabel,
        index,
        ok: false,
        statusText: "Не указан номер пропуска",
        resultId: null,
        scoreNum: null,
      };
    }

    const app = byPass.get(normalizePass(pass));
    if (!app) {
      return {
        ...row,
        pass,
        fio,
        subject: subjectLabel,
        index,
        ok: false,
        statusText: "Абитуриент не найден в базе",
        resultId: null,
        scoreNum: null,
      };
    }

    const exam = examMap.get(app.examId) || app.exam;
    const resolvedSubject = exam
      ? subjectName(exam.subjectId)
      : subjectLabel !== "—"
        ? subjectLabel
        : "—";

    if (row.subject.trim()) {
      const expected = normalizeSubject(resolvedSubject);
      const got = normalizeSubject(row.subject);
      if (
        expected &&
        got &&
        expected !== got &&
        !expected.includes(got) &&
        !got.includes(expected)
      ) {
        return {
          ...row,
          pass,
          fio,
          subject: row.subject.trim(),
          index,
          ok: false,
          statusText: `Предмет «${row.subject.trim()}» не совпадает с записью («${resolvedSubject}»)`,
          resultId: null,
          scoreNum: null,
        };
      }
    }

    const scoreNum = Number(scoreRaw.replace(",", "."));
    if (
      scoreRaw === "" ||
      Number.isNaN(scoreNum) ||
      !Number.isInteger(scoreNum) ||
      scoreNum < 0 ||
      scoreNum > 100
    ) {
      const shown = scoreRaw || "—";
      return {
        ...row,
        pass,
        fio,
        subject: resolvedSubject,
        index,
        ok: false,
        statusText: `Балл ${shown} вне диапазона (0–100)`,
        resultId: null,
        scoreNum: null,
      };
    }

    const result = resultByUserExam.get(`${app.userId}:${app.examId}`) || null;
    if (result?.status === "published") {
      return {
        ...row,
        pass,
        fio,
        subject: resolvedSubject,
        score: String(scoreNum),
        index,
        ok: false,
        statusText: "Результат уже опубликован",
        resultId: result.id,
        scoreNum,
      };
    }

    // Missing registry row is OK — sync during import creates it.
    return {
      ...row,
      pass,
      fio,
      subject: resolvedSubject,
      score: String(scoreNum),
      index,
      ok: true,
      statusText: "Корректно",
      resultId: result?.id || null,
      scoreNum,
    };
  });
}

export function ResultsImport({ subjects }: ResultsImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [fileError, setFileError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadingRefs, setLoadingRefs] = useState(true);
  const [refsError, setRefsError] = useState<string | null>(null);

  const [applications, setApplications] = useState<ExamApplication[]>([]);
  const [results, setResults] = useState<CtResult[]>([]);
  const [exams, setExams] = useState<ExamSession[]>([]);

  const subjectName = useCallback(
    (subjectId: string) =>
      subjects.find((s) => s.id === subjectId)?.name || "Предмет",
    [subjects],
  );

  const examsById = useMemo(() => {
    const map = new Map<string, ExamSession>();
    for (const exam of exams) map.set(exam.id, exam);
    return map;
  }, [exams]);

  const loadRefs = useCallback(async () => {
    setLoadingRefs(true);
    setRefsError(null);
    try {
      const [appsRes, resultsRes, examsRes] = await Promise.all([
        fetch("/api/exam/examiner/applications?status=approved"),
        fetch("/api/results/examiner/results?status=all"),
        fetch("/api/exam/examiner/exams"),
      ]);
      const appsJson = (await appsRes.json().catch(() => ({}))) as {
        items?: ExamApplication[];
        error?: string;
      };
      const resultsJson = (await resultsRes.json().catch(() => ({}))) as
        ExaminerResultsResponse & { error?: string };
      const examsJson = (await examsRes.json().catch(() => [])) as
        | ExamSession[]
        | { error?: string };

      if (!appsRes.ok) {
        setRefsError(appsJson.error || "Не удалось загрузить заявки");
        return;
      }
      if (!resultsRes.ok) {
        setRefsError(resultsJson.error || "Не удалось загрузить результаты");
        return;
      }
      if (!examsRes.ok) {
        setRefsError(
          !Array.isArray(examsJson) && examsJson.error
            ? examsJson.error
            : "Не удалось загрузить экзамены",
        );
        return;
      }

      setApplications(appsJson.items || []);
      setResults(resultsJson.items || []);
      setExams(Array.isArray(examsJson) ? examsJson : []);
    } catch {
      setRefsError("Сеть недоступна. Проверьте exam-service и results-service.");
    } finally {
      setLoadingRefs(false);
    }
  }, []);

  useEffect(() => {
    void loadRefs();
  }, [loadRefs]);

  const preview = useMemo(
    () => buildPreview(parsedRows, applications, results, examsById, subjectName),
    [parsedRows, applications, results, examsById, subjectName],
  );

  const readyCount = useMemo(() => preview.filter((r) => r.ok).length, [preview]);
  const errorCount = useMemo(() => preview.filter((r) => !r.ok).length, [preview]);

  function handleFile(file: File) {
    setImportMsg(null);
    setImportError(null);
    setFileError(null);
    setParsedRows([]);
    setFileName(file.name);

    if (file.size > MAX_FILE_BYTES) {
      setFileError("Файл больше 15 МБ. Выберите файл меньшего размера.");
      setFileName(null);
      return;
    }

    const ext = fileExtension(file.name);
    if (!ACCEPTED_EXT.includes(ext as (typeof ACCEPTED_EXT)[number])) {
      setFileError("Поддерживаются только .csv, .xlsx и .xls.");
      setFileName(null);
      return;
    }

    if (isExcelExt(ext)) {
      setFileError(
        "Разбор Excel (.xlsx/.xls) пока не подключён. Скачайте CSV-шаблон или сохраните ведомость как CSV.",
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsed = parseCsv(text);
      if (parsed.length === 0) {
        setFileError("В файле нет строк данных. Проверьте шаблон таблицы.");
        return;
      }
      setParsedRows(parsed);
    };
    reader.onerror = () => {
      setFileError("Не удалось прочитать файл.");
    };
    reader.readAsText(file, "utf-8");
  }

  async function ensureSynced(): Promise<CtResult[]> {
    const res = await fetch("/api/results/examiner/results/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = (await res.json().catch(() => ({}))) as {
      items?: CtResult[];
      error?: string;
    };
    if (!res.ok) throw new Error(json.error || "Не удалось синхронизировать реестр");
    const items = json.items || [];
    setResults(items);
    return items;
  }

  async function importValidRows() {
    if (readyCount === 0) return;

    setBusy(true);
    setImportMsg(null);
    setImportError(null);
    try {
      const currentResults = await ensureSynced();
      const freshPreview = buildPreview(
        parsedRows,
        applications,
        currentResults,
        examsById,
        subjectName,
      );

      const byPass = new Map<string, ExamApplication>();
      for (const app of applications) {
        if (!app.passNumber) continue;
        byPass.set(normalizePass(app.passNumber), app);
      }
      const resultByUserExam = new Map<string, CtResult>();
      for (const row of currentResults) {
        resultByUserExam.set(`${row.userId}:${row.examId}`, row);
      }

      let imported = 0;
      const failures: string[] = [];

      for (const row of freshPreview) {
        if (!row.ok || row.scoreNum === null) continue;

        let resultId = row.resultId;
        if (!resultId) {
          const app = byPass.get(normalizePass(row.pass));
          resultId = app
            ? resultByUserExam.get(`${app.userId}:${app.examId}`)?.id || null
            : null;
        }
        if (!resultId) {
          failures.push(`${row.pass}: нет строки результата`);
          continue;
        }

        const res = await fetch(`/api/results/examiner/results/${resultId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: row.scoreNum, status: "draft" }),
        });
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          failures.push(`${row.pass}: ${json.error || "ошибка сохранения"}`);
          continue;
        }
        imported += 1;
      }

      await loadRefs();

      if (imported > 0) {
        setImportMsg(
          `Импортировано черновиков: ${imported}${
            failures.length ? `. Пропущено с ошибками: ${failures.length}` : ""
          }.`,
        );
      } else {
        setImportError(
          failures.length
            ? `Не удалось импортировать: ${failures.slice(0, 3).join("; ")}`
            : "Нет корректных строк для импорта.",
        );
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Ошибка импорта");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Импорт результатов ЦТ
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Загрузка ведомостей из CSV или Excel с автоматической валидацией строк
          </p>
        </div>
        <button
          type="button"
          onClick={downloadTemplate}
          className="text-sm font-bold text-brand-700 hover:text-brand-900 hover:underline"
        >
          Скачать шаблон таблицы
        </button>
      </div>

      {refsError ? (
        <Alert>{refsError}</Alert>
      ) : null}

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
        className={cn(
          "flex min-h-[180px] flex-col items-center justify-center rounded-[14px] border-2 border-dashed px-6 py-10 text-center",
          dragOver ? "border-brand-500 bg-brand-50" : "border-border bg-white",
        )}
      >
        <UploadIcon />
        <p className="text-sm font-semibold text-text-primary">
          Перетащите файл ведомости CSV или Excel сюда
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Поддерживаются форматы: .csv, .xlsx, .xls до 15 МБ
        </p>
        <FormButton
          type="button"
          className="mt-4 w-auto px-4 py-2.5"
          onClick={() => inputRef.current?.click()}
        >
          Выбрать файл на диске
        </FormButton>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        {fileName ? (
          <p className="mt-3 text-xs text-text-secondary">Файл: {fileName}</p>
        ) : null}
        {fileError ? (
          <p className="mt-3 max-w-md text-xs font-semibold text-red-700">{fileError}</p>
        ) : null}
        {loadingRefs ? (
          <p className="mt-2 text-xs text-text-muted">Загрузка справочников для проверки…</p>
        ) : null}
      </div>

      {preview.length > 0 ? (
        <section className="space-y-3 rounded-[14px] border border-border bg-white p-4 shadow-[var(--shadow-soft)] sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-brand-900">Предпросмотр</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Проверено {preview.length}{" "}
                {preview.length === 1 ? "запись" : preview.length < 5 ? "записи" : "записей"}
                . Строки с ошибками подсвечены красным.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
                Готово к импорту: {readyCount}
              </span>
              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-bold text-red-700">
                С ошибками: {errorCount}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-[12px] border border-border">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border bg-[#f8fafc] text-xs font-bold uppercase tracking-wide text-text-muted">
                <tr>
                  <th className="px-3 py-3">№</th>
                  <th className="px-3 py-3">Номер пропуска</th>
                  <th className="px-3 py-3">ФИО</th>
                  <th className="px-3 py-3">Предмет</th>
                  <th className="px-3 py-3">Балл</th>
                  <th className="px-3 py-3">Статус верификации</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr
                    key={`${row.pass}-${row.index}`}
                    className={cn(
                      "border-b border-border last:border-b-0",
                      !row.ok && "bg-[#fde8e8]",
                    )}
                  >
                    <td className="px-3 py-3 tabular-nums text-text-secondary">{row.index}</td>
                    <td className="px-3 py-3 font-semibold text-text-primary">{row.pass}</td>
                    <td className="px-3 py-3">{row.fio}</td>
                    <td className="px-3 py-3">{row.subject}</td>
                    <td className="px-3 py-3 font-bold tabular-nums text-brand-900">
                      {row.score || "—"}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-3 text-sm",
                        row.ok ? "font-semibold text-emerald-800" : "font-semibold text-red-700",
                      )}
                    >
                      {row.statusText}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {preview.length > 0
            ? "Строки с ошибками будут пропущены при импорте."
            : "После загрузки файла появится предпросмотр с проверкой строк."}
        </p>
        <FormButton
          type="button"
          className="w-auto min-w-[280px] px-5 py-2.5"
          disabled={readyCount === 0 || busy || loadingRefs}
          onClick={() => void importValidRows()}
        >
          {busy ? "Импорт…" : "Импортировать корректные строки как черновики"}
        </FormButton>
      </div>

      {importMsg ? (
        <Alert variant="success">{importMsg}</Alert>
      ) : null}
      {importError ? (
        <Alert>{importError}</Alert>
      ) : null}
    </div>
  );
}
