import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";

const serviceLinks = [
  { href: "#how", label: "Как это работает" },
  { href: "#features", label: "Возможности" },
  { href: "#faq", label: "Частые вопросы" },
];

const applicantLinks = [
  { href: "/register", label: "Регистрация" },
  { href: "/login", label: "Вход в кабинет" },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-white">
      <Container className="py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div className="sm:col-span-2 lg:col-span-1">
            <Logo />
            <p className="mt-3 max-w-[280px] text-xs leading-relaxed text-text-muted">
              Сервис для записи на ЦТ, просмотра результатов, пробников и оценки
              шансов поступления в университеты и колледжи.
            </p>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
              Сервис
            </h3>
            <ul className="space-y-2.5">
              {serviceLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] font-medium text-text-secondary transition-colors hover:text-brand-700"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
              Абитуриенту
            </h3>
            <ul className="space-y-2.5">
              {applicantLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-[13px] font-medium text-text-secondary transition-colors hover:text-brand-700"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
              Начать
            </h3>
            <p className="mb-3 text-xs leading-relaxed text-text-muted">
              Создайте аккаунт и узнайте, куда хватает баллов.
            </p>
            <Button href="/register" className="inline-flex px-4 py-2 text-sm">
              Начать бесплатно
            </Button>
            <p className="mt-4 text-[11px] text-text-muted">
              Поддержка:{" "}
              <a
                href="mailto:support@abiturient.by"
                className="font-semibold text-brand-700 hover:underline"
              >
                support@abiturient.by
              </a>
            </p>
          </div>
        </div>
      </Container>

      <div className="border-t border-border bg-[#f8fafc]">
        <Container className="py-4 text-xs text-text-muted">
          © 2026 Ориентир · Информационный портал для абитуриентов
        </Container>
      </div>
    </footer>
  );
}
