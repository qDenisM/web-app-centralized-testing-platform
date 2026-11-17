import { Suspense } from "react";
import { ModeratorCtApplications } from "@/components/moderator/ModeratorCtApplications";

export default function ModeratorApplicationsPage() {
  return (
    <Suspense
      fallback={<p className="text-sm text-text-muted">Загрузка заявок…</p>}
    >
      <ModeratorCtApplications />
    </Suspense>
  );
}
