import { ModeratorShell } from "@/components/layout/ModeratorShell";

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ModeratorShell>{children}</ModeratorShell>;
}
