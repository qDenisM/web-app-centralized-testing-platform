import dynamic from "next/dynamic";
import { Suspense } from "react";
import { PageLoading } from "@/components/ui/PageLoading";

const ModeratorCtApplications = dynamic(
  () =>
    import("@/components/moderator/ModeratorCtApplications").then((m) => ({
      default: m.ModeratorCtApplications,
    })),
  { loading: () => <PageLoading label="Загрузка заявок…" /> },
);

export default function ModeratorApplicationsPage() {
  return (
    <Suspense fallback={<PageLoading label="Загрузка заявок…" />}>
      <ModeratorCtApplications />
    </Suspense>
  );
}
