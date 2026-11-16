import { VerificationQueue } from "@/components/moderator/VerificationQueue";

export default function ModeratorHistoryPage() {
  return (
    <VerificationQueue
      title="Журнал решений модератора"
      subtitle="Отклонённые и уже рассмотренные анкеты абитуриентов."
      initialTab="rejected"
    />
  );
}
