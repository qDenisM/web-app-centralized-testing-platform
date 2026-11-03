import Image from "next/image";
import Link from "next/link";

type LogoProps = {
  compact?: boolean;
};

export function Logo({ compact = false }: LogoProps) {
  return (
    <Link href="/" className="inline-flex shrink-0 items-center gap-2.5">
      <Image
        src="/logo-icon.png"
        alt="Ориентир"
        width={36}
        height={36}
        className="rounded-[10px] shadow-[var(--shadow-soft)]"
        priority
      />
      <span className="flex flex-col">
        <span className="text-base font-extrabold leading-tight tracking-tight text-brand-900">
          ОРИЕНТИР
        </span>
        {!compact ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
            ЦТ и вузы Беларуси
          </span>
        ) : null}
      </span>
    </Link>
  );
}
