import { VerificationCard } from "@/components/moderator/VerificationCard";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ModeratorVerificationPage({ params }: PageProps) {
  const { id } = await params;
  return <VerificationCard id={id} />;
}
