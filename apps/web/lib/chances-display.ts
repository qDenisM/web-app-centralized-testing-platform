import type { ChanceResult, ChanceStatus } from "./chances";
import { chanceDotClasses, chanceStatusClasses } from "./chances";

/**
 * Incomplete calc: missing approved attestat, required CT subject, or passing score.
 * Backend encodes this as probability 0 with scoreGap === null.
 */
export function isChanceIncomplete(
  chance: Pick<ChanceResult, "scoreGap"> | null | undefined,
): boolean {
  return !!chance && chance.scoreGap == null;
}

export function catalogChanceLabel(
  status: ChanceStatus,
  chance?: Pick<ChanceResult, "scoreGap"> | null,
): string {
  if (isChanceIncomplete(chance)) return "Мало данных ЦТ";
  if (status === "green") return "Проходит";
  if (status === "yellow") return "На грани";
  return "Балл ниже проходного";
}

/** Percent text for UI; incomplete rows show em dash instead of a fake 0%. */
export function catalogChancePercent(
  chance: Pick<ChanceResult, "probability" | "scoreGap">,
): string {
  if (isChanceIncomplete(chance)) return "—";
  return `${Math.round(chance.probability ?? 0)}%`;
}

/** Compact badge: "Мало данных ЦТ" or "Проходит (95%)". */
export function formatChanceBadge(
  chance: Pick<ChanceResult, "status" | "probability" | "scoreGap">,
): string {
  const label = catalogChanceLabel(chance.status, chance);
  if (isChanceIncomplete(chance)) return label;
  return `${label} (${catalogChancePercent(chance)})`;
}

export function catalogChanceDetail(
  chance: Pick<ChanceResult, "scoreGap"> | null | undefined,
): string | null {
  if (!chance) return null;
  if (isChanceIncomplete(chance)) {
    return "Нужны опубликованные баллы ЦТ по всем предметам специальности";
  }
  const gap = chance.scoreGap;
  if (gap == null) return null;
  if (gap < 0) return `Не хватает: ${Math.abs(gap)} баллов`;
  if (gap > 0) return `Запас: +${gap} баллов`;
  return "Вровень с проходным";
}

export { chanceDotClasses, chanceStatusClasses };
