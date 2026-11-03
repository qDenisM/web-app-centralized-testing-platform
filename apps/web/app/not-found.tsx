import type { Metadata } from "next";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";

export const metadata: Metadata = {
  title: "Страница не найдена — Ориентир",
};

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-white">
        <Container className="flex h-16 items-center">
          <Logo />
        </Container>
      </header>

      <main className="flex flex-1 items-center py-16">
        <Container className="max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-500">
            Ошибка 404
          </p>

          <div className="mt-4 text-[96px] font-black leading-none tracking-tight text-brand-100 md:text-[128px]">
            404
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-brand-900 md:text-3xl">
            Кажется, ты сбился с маршрута
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
            Такой страницы в Ориентире нет. Возможно, ссылка устарела или в адресе
            опечатка. Вернись на главную и продолжай готовиться к поступлению.
          </p>

          <div className="mx-auto mt-8 max-w-md rounded-[12px] border border-border bg-white p-4 text-left shadow-[var(--shadow-soft)]">
            <p className="text-xs font-bold text-brand-900">Куда можно пойти</p>
            <ul className="mt-2 space-y-1.5 text-xs text-text-secondary">
              <li>• главная — оценить шансы поступления</li>
              <li>• вход — открыть личный кабинет</li>
              <li>• регистрация — создать аккаунт абитуриента</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/" className="px-6 py-3">
              На главную
            </Button>
            <Button href="/login" variant="secondary" className="px-6 py-3">
              Войти в аккаунт
            </Button>
          </div>
        </Container>
      </main>
    </div>
  );
}
