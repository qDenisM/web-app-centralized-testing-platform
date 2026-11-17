"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import {
  verificationStatusLabel,
  type ApplicantProfile,
  type OcrAttestatResponse,
  type UploadUrlResponse,
} from "@/lib/applicant";
import { cn } from "@/lib/utils";

const MAX_BYTES = 10 * 1024 * 1024;

export function CertificateForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<ApplicantProfile | null>(null);
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [graduateName, setGraduateName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [attestatAverage, setAttestatAverage] = useState("");
  const [attestatIssuedOn, setAttestatIssuedOn] = useState("");
  const [lowConfidence, setLowConfidence] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ocrHint, setOcrHint] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    attestatAverage?: string;
    storageKey?: string;
  }>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/applicant/profile");
        const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
          error?: string;
        };
        if (!res.ok) {
          if (!cancelled) setError(data.error || "Не удалось загрузить профиль");
          return;
        }
        if (cancelled) return;
        setProfile(data);
        // Recognition form stays empty until OCR / manual input.
        setStorageKey(null);
        setFileName(null);
        setGraduateName("");
        setSchoolName("");
        setAttestatAverage("");
        setAttestatIssuedOn("");
        setLowConfidence([]);
      } catch {
        if (!cancelled) {
          setError("Сеть недоступна. Проверьте applicant-service.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runOcr(key: string) {
    setOcrLoading(true);
    setOcrHint(null);
    try {
      const res = await fetch("/api/applicant/attestat/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ storageKey: key }),
      });
      const data = (await res.json().catch(() => ({}))) as OcrAttestatResponse & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "OCR не удался, заполните поля вручную");
        return;
      }
      // Stub/fallback: keep upload usable, ask user to fill manually.
      if (data.stub || (!data.graduateName && data.attestatAverage == null)) {
        setGraduateName("");
        setSchoolName("");
        setAttestatAverage("");
        setAttestatIssuedOn("");
        setLowConfidence([]);
        setOcrHint(
          data.error
            ? `Скан сохранён. ${data.error}`
            : "Скан сохранён. Автораспознавание недоступно — заполните поля вручную.",
        );
        return;
      }
      setGraduateName(data.graduateName || "");
      setSchoolName(data.schoolName || "");
      setAttestatAverage(
        data.attestatAverage != null ? String(data.attestatAverage) : "",
      );
      setAttestatIssuedOn(data.attestatIssuedOn || "");
      setLowConfidence(data.lowConfidenceFields || []);
    } catch {
      setError("OCR недоступен, заполните поля вручную");
    } finally {
      setOcrLoading(false);
    }
  }

  async function uploadFile(file: File) {
    setError(null);

    if (file.size > MAX_BYTES) {
      setError("Файл больше 10 МБ");
      return;
    }

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];
    if (!allowed.includes(file.type)) {
      setError("Нужен JPG, PNG, WEBP или PDF");
      return;
    }

    setUploading(true);
    try {
      const urlRes = await fetch("/api/applicant/attestat/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const signed = (await urlRes.json().catch(() => ({}))) as UploadUrlResponse & {
        error?: string;
      };
      if (!urlRes.ok) {
        setError(signed.error || "Не удалось получить ссылку для загрузки");
        return;
      }

      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!put.ok) {
        setError("Не удалось загрузить файл в хранилище");
        return;
      }

      setStorageKey(signed.storageKey);
      setFileName(file.name);
      setFieldErrors((prev) => ({ ...prev, storageKey: undefined }));
      setUploading(false);
      await runOcr(signed.storageKey);
    } catch {
      setError("Ошибка загрузки");
      setUploading(false);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (file) void uploadFile(file);
  }

  function clearFields() {
    setGraduateName("");
    setSchoolName("");
    setAttestatAverage("");
    setAttestatIssuedOn("");
    setLowConfidence([]);
    setFieldErrors({});
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const nextErrors: { attestatAverage?: string; storageKey?: string } = {};

    if (!storageKey) {
      nextErrors.storageKey = "Загрузите скан аттестата";
    }

    const trimmed = attestatAverage.trim();
    if (!trimmed) {
      nextErrors.attestatAverage = "Заполните это поле";
    } else {
      const average = Number(trimmed.replace(",", "."));
      if (!Number.isFinite(average) || average < 1 || average > 10) {
        nextErrors.attestatAverage = "Средний балл должен быть от 1.0 до 10.0";
      }
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    const average = Number(attestatAverage.replace(",", "."));
    setSaving(true);
    try {
      const res = await fetch("/api/applicant/attestat/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storageKey,
          graduateName: graduateName || null,
          schoolName: schoolName || null,
          attestatAverage: average,
          attestatIssuedOn: attestatIssuedOn || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as ApplicantProfile & {
        error?: string;
      };
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить");
        return;
      }
      setProfile(data);
      setLowConfidence([]);
      alert("Данные аттестата сохранены");
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка…</p>;
  }

  const schoolDoubt = lowConfidence.includes("schoolName");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Аттестат и распознавание среднего балла
        </h1>
        {profile?.attestatAverage != null ? (
          <p className="mt-2 text-sm font-semibold text-brand-800">
            Текущий средний балл в профиле: {profile.attestatAverage}
          </p>
        ) : null}
        {profile?.verification?.status ? (
          <p className="mt-1 text-sm text-text-secondary">
            Статус анкеты:{" "}
            <span className="font-semibold text-brand-800">
              {verificationStatusLabel(profile.verification.status)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <h2 className="mb-3 text-sm font-bold text-brand-900">
            Фотокопия аттестата
          </h2>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="hidden"
            onChange={(e) => onFileChange(e.target.files)}
          />

          <button
            type="button"
            disabled={uploading || ocrLoading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              onFileChange(e.dataTransfer.files);
            }}
            className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-border bg-[#f4f7f9] px-6 py-8 text-center transition-colors hover:border-brand-500 disabled:opacity-70"
          >
            {uploading || ocrLoading ? (
              <span className="text-sm font-semibold text-brand-900">
                {uploading
                  ? "Загружаем файл…"
                  : "Идёт оптическое распознавание…"}
              </span>
            ) : storageKey ? (
              <>
                <span className="text-sm font-bold text-brand-900">
                  Документ загружен
                </span>
                <span className="mt-1 text-xs text-text-muted">
                  {fileName || "скан в MinIO"}
                </span>
                <span className="mt-4 rounded-[8px] border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-brand-800">
                  Выбрать фото
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-text-primary">
                  Перетащите фото аттестата сюда
                </span>
                <span className="mt-1 text-xs text-text-muted">
                  Форматы JPG, PNG или PDF до 10 МБ
                </span>
                <span className="mt-4 rounded-[8px] border border-border bg-white px-3.5 py-1.5 text-xs font-bold text-brand-800">
                  Выбрать фото
                </span>
              </>
            )}
          </button>
        </section>

        <section className="rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]">
          <div className="mb-4 flex items-start justify-between gap-3 border-b border-border pb-3">
            <div>
              <h2 className="text-sm font-bold text-brand-900">
                Результаты распознавания
              </h2>
              <p className="text-xs text-text-muted">
                Проверьте данные перед сохранением
              </p>
            </div>
            {lowConfidence.length > 0 || ocrHint ? (
              <span className="rounded-full border border-[#C6900A]/30 bg-[#FFF4D6] px-2.5 py-0.5 text-[11px] font-bold text-[#9A6B00]">
                Заполните вручную
              </span>
            ) : null}
          </div>

          {ocrHint ? (
            <p className="mb-4 rounded-[10px] border border-[#C6900A]/25 bg-[#FFF4D6] px-3 py-2 text-xs font-semibold text-[#9A6B00]">
              {ocrHint}
            </p>
          ) : null}

          <form noValidate onSubmit={onSubmit} className="space-y-4">
            <Input
              label="ФИО выпускника"
              name="graduateName"
              value={graduateName}
              onChange={(e) => setGraduateName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />

            <label className="block space-y-1.5">
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-text-secondary">
                Учебное заведение
                {schoolDoubt ? (
                  <span className="text-[10px] font-bold text-[#9A6B00]">
                    Проверьте: распознано с сомнениями
                  </span>
                ) : null}
              </span>
              <input
                name="schoolName"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="ГУО «Гимназия № 1 г. Минска»"
                className={cn(
                  "w-full rounded-[10px] border bg-white px-3.5 py-2.5 text-sm text-text-primary outline-none transition-colors",
                  "placeholder:text-text-muted focus:ring-2",
                  schoolDoubt
                    ? "border-[#C6900A] bg-[#FFF4D6]/20 focus:border-[#C6900A] focus:ring-[#C6900A]/20"
                    : "border-border focus:border-brand-500 focus:ring-brand-100",
                )}
              />
            </label>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Средний балл (1.0–10.0)"
                name="attestatAverage"
                type="number"
                step="0.1"
                min="1"
                max="10"
                value={attestatAverage}
                onChange={(e) => {
                  setAttestatAverage(e.target.value);
                  if (fieldErrors.attestatAverage) {
                    setFieldErrors((prev) => ({
                      ...prev,
                      attestatAverage: undefined,
                    }));
                  }
                }}
                placeholder="9.0"
                error={fieldErrors.attestatAverage}
              />
              <Input
                label="Дата выдачи"
                name="attestatIssuedOn"
                type="date"
                value={attestatIssuedOn}
                onChange={(e) => setAttestatIssuedOn(e.target.value)}
              />
            </div>

            <div className="rounded-[10px] border border-[#2F6FAE]/20 bg-[#E7F0F8] px-3 py-2.5 text-xs text-[#2F6FAE]">
              Значение среднего балла будет записано в ваш конкурсный профиль.
            </div>

            {fieldErrors.storageKey ? (
              <p
                role="alert"
                className="flex items-start gap-2 rounded-[10px] border border-[#C94343]/25 bg-[#FDECEC] px-3 py-2 text-xs font-semibold text-[#9B2C2C]"
              >
                <span
                  className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-[#C94343] text-[10px] font-black text-white"
                  aria-hidden
                >
                  !
                </span>
                {fieldErrors.storageKey}
              </p>
            ) : null}

            {error ? (
              <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-border pt-3">
              <FormButton
                type="button"
                variant="secondary"
                className="w-auto px-4 py-2"
                onClick={clearFields}
              >
                Очистить поля
              </FormButton>
              <FormButton
                className="w-auto px-4 py-2"
                disabled={saving || uploading || ocrLoading}
              >
                {saving ? "Сохраняем…" : "Подтвердить"}
              </FormButton>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
