import type { ChanceResult, Favorite } from "../generated/prisma/index.js";

export function favoriteJson(row: Favorite) {
  return {
    id: row.id,
    userId: row.userId,
    specialtyId: row.specialtyId,
    createdAt: row.createdAt.toISOString(),
  };
}

export function chanceResultJson(row: ChanceResult) {
  return {
    id: row.id,
    userId: row.userId,
    specialtyId: row.specialtyId,
    status: row.status,
    probability: row.probability,
    scoreGap: row.scoreGap,
    calculatedAt: row.calculatedAt.toISOString(),
  };
}