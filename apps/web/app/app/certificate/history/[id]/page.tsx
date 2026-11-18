import { CertificateHistoryDetail } from "@/components/certificate/CertificateHistoryDetail";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CertificateHistoryDetailPage({
  params,
}: PageProps) {
  const { id } = await params;
  return <CertificateHistoryDetail id={id} />;
}
