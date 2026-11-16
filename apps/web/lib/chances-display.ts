import type { ChanceStatus } from "@/lib/chances";
import {
  chanceDotClasses,
  chanceStatusClasses,
} from "@/lib/chances";

export function catalogChanceLabel(status: ChanceStatus): string {
  if (status === "green") return "Проходит";
  if (status === "yellow") return "На грани";
  return "Не хватает";
}

export { chanceDotClasses, chanceStatusClasses };