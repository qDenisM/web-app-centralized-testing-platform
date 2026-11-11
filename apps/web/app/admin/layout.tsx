import { CabinetShell } from "@/components/layout/CabinetShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CabinetShell title="Админ">{children}</CabinetShell>;
}
