import Link from "next/link";

export default function ApplicantHomePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-900">
          Личный кабинет
        </h1>
        <p className="mt-1 max-w-xl text-sm leading-relaxed text-text-secondary">
          Вы вошли как абитуриент. Можно смотреть каталог вузов и специальностей.
        </p>
      </div>

      <Link
        href="/app/universities"
        className="inline-flex rounded-[10px] bg-brand-700 px-4 py-2.5 text-sm font-bold text-white shadow-[var(--shadow-soft)] hover:bg-brand-800"
      >
        Открыть каталог вузов
      </Link>
    </div>
  );
}
