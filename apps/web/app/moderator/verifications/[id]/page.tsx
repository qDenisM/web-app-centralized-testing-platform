import Link from "next/link";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModeratorVerificationPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <div className="space-y-3">
      <Link
        href="/moderator"
        className="text-sm font-semibold text-brand-700 hover:underline"
      >
        ← К очереди
      </Link>
      <h1 className="text-2xl font-extrabold text-brand-900">
        Карточка проверки
      </h1>
      <p className="text-sm text-text-secondary">
        Заявка <span className="font-mono text-xs">{id}</span>. Действия
        «принять / вернуть / отказать» — в следующем пункте этапа 5.
      </p>
    </div>
  );
}
