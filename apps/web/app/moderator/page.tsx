import { VerificationQueue } from "@/components/moderator/VerificationQueue";

export default function ModeratorHomePage() {
  return (
    <VerificationQueue
      title="Оперативный обзор очередей модерации"
      subtitle="Сводка очереди проверки данных и заявок на ЦТ."
      initialTab="all"
    />
  );
}
