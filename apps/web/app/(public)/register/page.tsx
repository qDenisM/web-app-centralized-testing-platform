import type { Metadata } from "next";
import Link from "next/link";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Регистрация — Ориентир",
};

export default function RegisterPage() {
  return (
    <AuthCard
      aside={
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-500">
              Ориентир
            </p>
            <h2 className="mt-3 text-2xl font-extrabold leading-snug md:text-3xl">
              Регистрация абитуриента
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
              Создайте аккаунт один раз. Анкету и аттестат заполните в кабинете
              на следующих этапах.
            </p>

            <ol className="mt-6 space-y-3 text-sm">
              <li className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-700 text-xs font-bold">
                  1
                </span>
                <span className="font-semibold">Аккаунт</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-slate-500 text-xs font-bold">
                  2
                </span>
                <span>Личные данные (позже)</span>
              </li>
            </ol>
          </div>

          <Link
            href="/login"
            className="inline-flex w-fit items-center justify-center rounded-[10px] border border-brand-500/40 bg-brand-800/40 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
          >
            Уже есть аккаунт? Войти
          </Link>
        </div>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
