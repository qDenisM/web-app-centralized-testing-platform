import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { Logo } from "./Logo";

const navLinks = [
  { href: "#how", label: "Как это работает" },
  { href: "#features", label: "Возможности" },
  { href: "#faq", label: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white">
      <Container className="flex h-16 items-center justify-between gap-3">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-2.5 py-1.5 text-sm font-semibold text-text-secondary transition-colors hover:bg-bg-page hover:text-brand-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <Button
            href="/login"
            variant="secondary"
            className="hidden h-10 items-center px-4 text-sm md:inline-flex"
          >
            Войти
          </Button>

          <Button
            href="/register"
            className="inline-flex h-10 items-center whitespace-nowrap px-4 text-sm"
          >
            <span className="max-[530px]:hidden">Начать бесплатно</span>
            <span className="hidden max-[530px]:inline">Начать</span>
          </Button>

          <details className="relative md:hidden">
            <summary
              className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[10px] border border-border text-text-secondary hover:bg-bg-page [&::-webkit-details-marker]:hidden"
              aria-label="Открыть меню"
            >
              <MenuIcon />
            </summary>

            <nav className="absolute right-0 top-[calc(100%+8px)] z-50 w-56 rounded-[12px] border border-border bg-white p-2 shadow-[0_12px_28px_-4px_rgba(11,58,74,0.12)]">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="block rounded-lg px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-page hover:text-brand-900"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/login"
                className="mt-1 block rounded-lg border-t border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:bg-bg-page hover:text-brand-900"
              >
                Войти
              </Link>
            </nav>
          </details>
        </div>
      </Container>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}
