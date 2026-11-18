"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { FormButton } from "@/components/ui/FormButton";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

type LoginOk = {
  user: { role: string };
  homePath: string;
};

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => ({}))) as LoginOk & {
        error?: string;
      };

      if (!res.ok) {
        setError(data.error || "Не удалось войти");
        return;
      }

      const target =
        nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")
          ? nextPath
          : data.homePath || "/app";

      window.location.assign(target);
      return;
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
          Вход в систему
        </h1>
        <p className="mt-1 text-sm text-text-muted">
          Укажите учётные данные абитуриента
        </p>
      </div>

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

      <Input
        label="Пароль"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Не меньше 8 символов"
      />

      {error ? (
        <Alert compact>{error}</Alert>
      ) : null}

      <FormButton disabled={loading}>
        {loading ? "Входим…" : "Войти в личный кабинет"}
      </FormButton>

      <p className="text-center text-sm text-text-secondary">
        Нет аккаунта?{" "}
        <Link
          href="/register"
          className="font-bold text-brand-700 hover:text-brand-800 hover:underline"
        >
          Регистрация
        </Link>
      </p>
    </form>
  );
}
