import dynamic from "next/dynamic";
import { PageLoading } from "@/components/ui/PageLoading";

const ApplicantDashboard = dynamic(
  () =>
    import("@/components/applicant/ApplicantDashboard").then((m) => ({
      default: m.ApplicantDashboard,
    })),
  { loading: () => <PageLoading label="Загрузка сводки…" /> },
);

export default function ApplicantHomePage() {
  return <ApplicantDashboard />;
}
