export type SystemSettings = {
  dataMode: "production" | "demo";
  registrationOpen: boolean;
  ctApplicationsOpen: boolean;
  ocrEnabled: boolean;
  maintenanceMode: boolean;
  updatedAt: string;
};

export function dataModeLabel(mode: SystemSettings["dataMode"]): string {
  return mode === "demo" ? "Демо" : "Продакшн";
}
