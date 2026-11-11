import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Вход — Ориентир",
};

export default function LoginPage() {
  return (
    <AuthCard
      aside={
        <div className="flex h-full flex-col justify-between gap-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-500">
              Ориентир
            </p>
            <h2 className="mt-3 text-2xl font-extrabold leading-snug md:text-3xl">
              Узнай, куда ты проходишь
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-300">
              Баллы ЦТ, шансы на бюджет и пробники — в одном личном кабинете.
            </p>
          </div>
          <p className="text-xs text-slate-400">
            Демо: applicant@demo.local / Applicant1!
          </p>
        </div>
      }
    >
      <Suspense fallback={<p className="text-sm text-text-muted">Загрузка…</p>}>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
