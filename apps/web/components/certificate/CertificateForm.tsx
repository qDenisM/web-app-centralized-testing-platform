"use client";

import { FormEvent, useEffect, useRef, useState, type ReactNode } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Alert } from "@/components/ui/Alert";
import {
  type ApplicantProfile,
  type OcrAttestatResponse,
  type UploadUrlResponse,
} from "@/lib/applicant";

const MAX_BYTES = 10 * 1024 * 1024;

type CertificateFormProps = {
  /** Embed inside profile settings without page-level title. */
  embedded?: boolean;
  /** Extra content under the page title (status, history link, etc.). */
  belowTitle?: ReactNode;
  onProfileChange?: (profile: ApplicantProfile) => void;
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

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5 8 14l7.5-8" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-700 text-[11px] font-black text-white"
      aria-hidden
    >
      i
    </span>
  );
}

export function CertificateForm({
  embedded = false,
  belowTitle,
  onProfileChange,
}: CertificateFormProps) {
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
    graduateName?: string;
  }>({});
  const [ready, setReady] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);

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
        onProfileChange?.(data);
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

    const nextErrors: {
      attestatAverage?: string;
      storageKey?: string;
      graduateName?: string;
    } = {};

    if (!storageKey) {
      nextErrors.storageKey = "Загрузите скан аттестата";
    }

    if (graduateName.trim().length < 2) {
      nextErrors.graduateName = "Укажите ФИО выпускника";
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
          graduateName: graduateName.trim(),
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
      onProfileChange?.(data);
      setLowConfidence([]);
      setSavedOpen(true);
    } catch {
      setError("Сеть недоступна");
    } finally {
      setSaving(false);
    }
  }

  if (!ready) {
    return <p className="text-sm text-text-muted">Загрузка…</p>;
  }

  const doubt = (field: string) => lowConfidence.includes(field);
  const locked =
    profile?.verification?.status === "pending" ||
    profile?.verification?.status === "approved";

  const cardClass = embedded
    ? "rounded-[10px] border border-border bg-white p-4 shadow-[var(--shadow-soft)]"
    : "rounded-[14px] border border-border bg-white p-5 shadow-[var(--shadow-soft)]";

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
            Аттестат и распознавание среднего балла
          </h1>
          {profile?.attestatAverage != null ? (
            <p className="mt-2 text-sm font-semibold text-brand-800">
              Текущий средний балл в профиле: {profile.attestatAverage}
            </p>
          ) : null}
          {belowTitle}
        </div>
      ) : profile?.attestatAverage != null ? (
        <p className="text-sm font-semibold text-brand-800">
          Текущий средний балл в профиле: {profile.attestatAverage}
        </p>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <section className={cardClass}>
          <h2 className="mb-3 text-base font-bold text-brand-900">
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
            disabled={locked || uploading || ocrLoading}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (locked) return;
              onFileChange(e.dataTransfer.files);
            }}
            className="flex min-h-[280px] w-full flex-col items-center justify-center rounded-[10px] border-2 border-dashed border-[#B7C5CE] bg-[#EDF4F8] px-6 py-8 text-center transition-colors hover:border-brand-500 disabled:opacity-70"
          >
            {uploading || ocrLoading ? (
              <span className="text-sm font-semibold text-brand-900">
                {uploading
                  ? "Загружаем файл…"
                  : "Идёт оптическое распознавание…"}
              </span>
            ) : storageKey ? (
              <>
                <UploadIcon />
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
                <UploadIcon />
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

        <section className={cardClass}>
          <div className="mb-4">
            <h2 className="text-base font-bold text-brand-900">
              Результаты распознавания
            </h2>
            <p className="mt-0.5 text-xs text-text-muted">
              Проверьте данные перед отправкой
            </p>
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
              onChange={(e) => {
                setGraduateName(e.target.value);
                if (fieldErrors.graduateName) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    graduateName: undefined,
                  }));
                }
              }}
              placeholder="Иванов Иван Иванович"
              doubt={doubt("graduateName")}
              error={fieldErrors.graduateName}
              disabled={locked}
            />

            <Input
              label="Учебное заведение"
              name="schoolName"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder='ГУО/ "Гимназия № 1 г. Минска"'
              doubt={doubt("schoolName")}
              disabled={locked}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Input
                label="Средний балл аттестата"
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
                doubt={doubt("attestatAverage")}
                disabled={locked}
              />
              <Input
                label="Дата выдачи"
                name="attestatIssuedOn"
                type="date"
                value={attestatIssuedOn}
                onChange={(e) => setAttestatIssuedOn(e.target.value)}
                doubt={doubt("attestatIssuedOn")}
                disabled={locked}
              />
            </div>

            <div className="flex items-start gap-2.5 rounded-[10px] border border-[#2F6FAE]/20 bg-[#E7F0F8] px-3 py-2.5 text-xs leading-relaxed text-[#2F6FAE]">
              <InfoIcon />
              <span>
                Проверьте данные перед отправкой. Значение среднего балла будет
                зафиксировано в вашем конкурсном профиле.
              </span>
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
              <Alert compact>{error}</Alert>
            ) : null}

            {!locked ? (
              <div className="flex flex-wrap items-center justify-end gap-3 pt-1">
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
                  {saving ? (
                    "Сохраняем…"
                  ) : (
                    <>
                      <CheckIcon />
                      Подтвердить
                    </>
                  )}
                </FormButton>
              </div>
            ) : (
              <p className="border-t border-border pt-3 text-sm text-text-muted">
                Пока заявка на проверке или уже подтверждена, аттестат нельзя
                изменить.
              </p>
            )}
          </form>
        </section>
      </div>

      <Modal
        open={savedOpen}
        onClose={() => setSavedOpen(false)}
        title="Готово"
        size="sm"
        footer={
          <FormButton
            type="button"
            className="w-auto px-4 py-2.5"
            onClick={() => setSavedOpen(false)}
          >
            ОК
          </FormButton>
        }
      >
        <p className="text-sm leading-relaxed text-text-secondary">
          {profile?.verification?.status === "pending"
            ? "Данные аттестата сохранены и заявка отправлена на проверку модератору."
            : embedded
              ? "Данные аттестата сохранены. Заполните паспортные данные выше и нажмите «Отправить на проверку»."
              : "Данные аттестата сохранены. Если паспортные данные уже заполнены в настройках — нажмите «Отправить на проверку» ниже (или подтвердите скан ещё раз после заполнения анкеты)."}
        </p>
      </Modal>
    </div>
  );
}
