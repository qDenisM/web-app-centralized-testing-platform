"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";

type RegisterOk = {
  homePath: string;
};

export function RegisterForm() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
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

      router.replace(data.homePath || "/app");
      router.refresh();
    } catch {
      setError("Сеть недоступна. Проверьте, что identity запущен.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Создание аккаунта
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Email, ФИО и пароль — остальное заполните в кабинете позже
        </p>
      </div>

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

      {error ? (
        <p className="rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <FormButton disabled={loading}>
        {loading ? "Создаём…" : "Зарегистрироваться"}
      </FormButton>

      <p className="text-center text-sm text-text-secondary">
        Уже есть аккаунт?{" "}
        <Link
          href="/login"
          className="font-bold text-brand-700 hover:text-brand-800 hover:underline"
        >
          Войти
        </Link>
      </p>
    </form>
  );
}
