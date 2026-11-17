import { Suspense } from "react";
import { VerificationQueue } from "@/components/moderator/VerificationQueue";

export default function ModeratorDocsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-text-muted">Загрузка очереди…</p>}
    >
      <VerificationQueue
        title="Очередь проверки персональных данных"
        subtitle="Верификация паспортов и документов об образовании перед допуском к ЦТ"
      />
    </Suspense>
  );
}
