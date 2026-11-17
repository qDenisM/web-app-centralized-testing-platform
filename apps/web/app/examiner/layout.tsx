import { RequireAuth } from "@/components/auth/RequireAuth";
import { ExaminerShell } from "@/components/layout/ExaminerShell";

export default function ExaminerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ExaminerShell>{children}</ExaminerShell>
    </RequireAuth>
  );
}
