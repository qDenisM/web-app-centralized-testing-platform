import { RequireAuth } from "@/components/auth/RequireAuth";
import { ModeratorShell } from "@/components/layout/ModeratorShell";

export const dynamic = "force-dynamic";

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireAuth>
      <ModeratorShell>{children}</ModeratorShell>
    </RequireAuth>
  );
}
