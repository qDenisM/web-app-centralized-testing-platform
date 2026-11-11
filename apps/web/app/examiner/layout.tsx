import { CabinetShell } from "@/components/layout/CabinetShell";

export default function ExaminerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CabinetShell title="Экзаменатор">{children}</CabinetShell>;
}
