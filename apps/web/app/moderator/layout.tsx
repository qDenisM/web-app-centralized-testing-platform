import { CabinetShell } from "@/components/layout/CabinetShell";

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CabinetShell title="Модератор">{children}</CabinetShell>;
}
