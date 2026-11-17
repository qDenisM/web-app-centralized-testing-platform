export function getChancesUrl(): string {
  return process.env.CHANCES_URL?.replace(/\/$/, "") || "http://localhost:3006";
}

export type ChanceStatus = "green" | "yellow" | "red";

export type Favorite = {
  id: string;
  userId: string;
  specialtyId: string;
  createdAt: string;
};

export type ChanceResult = {
  id: string;
  userId: string;
  specialtyId: string;
  status: ChanceStatus;
  /** Admission probability in percent (0–100). */
  probability: number | null;
  scoreGap: number | null;
  calculatedAt: string;
};

export function chanceStatusLabel(status: ChanceStatus): string {
  if (status === "green") return "Высокий шанс";
  if (status === "yellow") return "Средний шанс";
  return "Низкий шанс / нет данных";
}

export function chanceStatusClasses(status: ChanceStatus): string {
  if (status === "green") {
    return "bg-emerald-50 text-emerald-800 border-emerald-200";
  }
  if (status === "yellow") {
    return "bg-amber-50 text-amber-900 border-amber-200";
  }
  return "bg-rose-50 text-rose-800 border-rose-200";
}

export function chanceDotClasses(status: ChanceStatus): string {
  if (status === "green") return "bg-emerald-500";
  if (status === "yellow") return "bg-amber-400";
  return "bg-rose-500";
}