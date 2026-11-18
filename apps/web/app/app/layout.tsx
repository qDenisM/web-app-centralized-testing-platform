import { RequireAuth } from "@/components/auth/RequireAuth";
import { ApplicantShell } from "@/components/layout/ApplicantShell";

/** Catalog/API are only available at runtime in Docker — never bake empty error pages. */
export const dynamic = "force-dynamic";

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
