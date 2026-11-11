import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";

type AuthCardProps = {
  aside: ReactNode;
  children: ReactNode;
};

/** Карточка входа/регистрации: тёмная панель слева + форма справа. */
export function AuthCard({ aside, children }: AuthCardProps) {
  return (
    <section className="py-10 md:py-14">
      <Container className="max-w-5xl">
        <div className="overflow-hidden rounded-[16px] border border-border bg-white shadow-[0_12px_32px_-8px_rgba(11,58,74,0.12)] md:grid md:grid-cols-2">
          <aside className="bg-brand-900 px-7 py-8 text-white md:px-9 md:py-10">
            {aside}
          </aside>
          <div className="px-6 py-8 md:px-9 md:py-10">{children}</div>
        </div>
      </Container>
    </section>
  );
}
