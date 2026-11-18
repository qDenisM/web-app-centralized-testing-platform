import { RequireAuth } from "@/components/auth/RequireAuth";
import { AdminShell } from "@/components/layout/AdminShell";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <AdminShell>{children}</AdminShell>
    </RequireAuth>
  );
}
