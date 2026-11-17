import { RequireAuth } from "@/components/auth/RequireAuth";
import { ApplicantShell } from "@/components/layout/ApplicantShell";

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ApplicantShell>{children}</ApplicantShell>
    </RequireAuth>
  );
}
