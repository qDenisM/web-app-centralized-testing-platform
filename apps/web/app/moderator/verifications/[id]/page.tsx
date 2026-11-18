import dynamic from "next/dynamic";
import { PageLoading } from "@/components/ui/PageLoading";

const VerificationCard = dynamic(
  () =>
    import("@/components/moderator/VerificationCard").then((m) => ({
      default: m.VerificationCard,
    })),
  { loading: () => <PageLoading label="Загрузка проверки…" /> },
);

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModeratorVerificationPage({ params }: PageProps) {
  const { id } = await params;
  return <VerificationCard id={id} />;
}
