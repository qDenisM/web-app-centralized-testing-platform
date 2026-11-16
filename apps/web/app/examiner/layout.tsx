import { ExaminerShell } from "@/components/layout/ExaminerShell";

export default function ExaminerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ExaminerShell>{children}</ExaminerShell>;
}