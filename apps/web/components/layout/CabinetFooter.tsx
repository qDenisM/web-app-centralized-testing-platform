import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";

type CabinetFooterProps = {
  roleLabel: string;
  roleLinks: Array<{ href: string; label: string }>;
  ctaTitle: string;
  ctaText: string;
  ctaHref: string;
  ctaLabel: string;
};

export function CabinetFooter({
  roleLabel,
  roleLinks,
  ctaTitle,
  ctaText,
  ctaHref,
  ctaLabel,
}: CabinetFooterProps) {
  return (
    <footer className="mt-auto border-t border-border bg-white">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-10 md:grid-cols-4 md:px-8 lg:gap-10">
        <div>
          <Logo />
          <p className="mt-3 max-w-[260px] text-xs leading-relaxed text-text-muted">
            Сервис для записи на ЦТ, просмотра результатов и оценки шансов
            поступления в университеты и колледжи Беларуси.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
            Сервис
          </h3>
          <ul className="space-y-2.5 text-[13px] font-medium text-text-secondary">
            <li>
              <Link href="/" className="hover:text-brand-700">
                Главная
              </Link>
            </li>
            <li>
              <Link href="/#how" className="hover:text-brand-700">
                Как это работает
              </Link>
            </li>
            <li>
              <Link href="/#features" className="hover:text-brand-700">
                Возможности
              </Link>
            </li>
            <li>
              <Link href="/#faq" className="hover:text-brand-700">
                FAQ
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
            {roleLabel}
          </h3>
          <ul className="space-y-2.5 text-[13px] font-medium text-text-secondary">
            {roleLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-brand-700">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-3 text-xs font-extrabold uppercase tracking-wide text-brand-900">
            {ctaTitle}
          </h3>
          <p className="mb-3 text-xs leading-relaxed text-text-muted">{ctaText}</p>
          <Button href={ctaHref} className="inline-flex px-4 py-2 text-sm">
            {ctaLabel}
          </Button>
        </div>
      </div>
      <div className="border-t border-border bg-[#f8fafc]">
        <div className="mx-auto w-full max-w-[1280px] px-4 py-4 text-xs text-text-muted md:px-8">
          © 2026 Ориентир · Информационный портал для абитуриентов
        </div>
      </div>
    </footer>
  );
}
