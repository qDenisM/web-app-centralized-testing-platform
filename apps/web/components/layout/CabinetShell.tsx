import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { Container } from "@/components/ui/Container";

type CabinetShellProps = {
  title: string;
  children: ReactNode;
};

/** Простая оболочка кабинета (сайдбар — на следующих этапах). */
export function CabinetShell({ title, children }: CabinetShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-white">
        <Container className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <Logo compact />
            <span className="hidden text-sm font-bold text-text-secondary sm:inline">
              {title}
            </span>
          </div>
          <LogoutButton />
        </Container>
      </header>
      <main className="flex-1 py-8">
        <Container>{children}</Container>
      </main>
    </div>
  );
}
