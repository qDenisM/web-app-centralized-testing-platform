"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";

type RegisterOk = {
  homePath: string;
};

const STORAGE_KEY = "orientir-register-profile-extra";

export function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [phone, setPhone] = useState("");

  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [city, setCity] = useState("");
  const [passportSeries, setPassportSeries] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [school, setSchool] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goNext(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== passwordConfirm) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 8) {
      setError("Пароль должен быть не короче 8 символов");
      return;
    }

    setStep(2);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, fullName }),
      });

      const data = (await res.json().catch(() => ({}))) as RegisterOk & {
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Не удалось зарегистрироваться");
        return;
      }

      const passport = passportSeries.trim() || null;
      const passportNum = passportNumber.trim() || null;
      await fetch("/api/applicant/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          birthDate: birthDate || null,
          passportSeries: passport,
          passportNumber: passportNum,
        }),
      });

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            phone: phone.trim(),
            city: city.trim(),
            schoolName: school.trim(),
            fullName: fullName.trim(),
          }),
        );
      } catch {}

      router.replace(data.homePath || "/app");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Проверьте, что identity запущен.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
          Шаг {step} из 2
        </p>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          {step === 1 ? "Создание аккаунта" : "Личные данные"}
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          {step === 1
            ? "Email, пароль и телефон для входа в кабинет"
            : "Анкета абитуриента для записи на ЦТ"}
        </p>
      </div>

      {step === 1 ? (
        <form onSubmit={goNext} className="space-y-5">
          <Input
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Пароль"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Минимум 8 символов"
            />
            <Input
              label="Повтор пароля"
              name="passwordConfirm"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              placeholder="Ещё раз"
            />
          </div>

          <Input
            label="Телефон"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+375 ..."
          />

          {error ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <FormButton type="submit">Далее</FormButton>
        </form>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5">
          <Input
            label="ФИО"
            name="fullName"
            autoComplete="name"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Иванов Иван Иванович"
          />

          <Input
            label="Дата рождения"
            name="birthDate"
            type="date"
            required
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
          />

          <Input
            label="Город"
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Минск"
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Серия и номер паспорта"
              name="passportSeries"
              value={passportSeries}
              onChange={(e) => setPassportSeries(e.target.value)}
              placeholder="AB"
            />
            <Input
              label="Номер паспорта"
              name="passportNumber"
              value={passportNumber}
              onChange={(e) => setPassportNumber(e.target.value)}
              placeholder="1234567"
            />
          </div>

          <Input
            label="Учебное заведение"
            name="school"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="Средняя школа № …"
          />

          {error ? (
            <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row">
            <FormButton
              type="button"
              variant="secondary"
              className="sm:w-auto sm:flex-1"
              onClick={() => {
                setStep(1);
                setError(null);
              }}
              disabled={loading}
            >
              Назад
            </FormButton>
            <FormButton disabled={loading} className="sm:flex-1">
              {loading ? "Создаём…" : "Зарегистрироваться"}
            </FormButton>
          </div>
        </form>
      )}

      <p className="text-center text-sm text-text-secondary">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-bold text-brand-700 hover:text-brand-800 hover:underline"
        >
          Войти
        </Link>
      </p>
    </div>
  );
}