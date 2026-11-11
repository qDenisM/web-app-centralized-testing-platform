import { CabinetShell } from "@/components/layout/CabinetShell";

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CabinetShell title="Кабинет абитуриента">{children}</CabinetShell>;
}
