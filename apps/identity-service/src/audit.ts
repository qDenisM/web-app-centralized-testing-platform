import type { Prisma } from "@prisma/client";
import { prisma } from "./db.js";

export async function writeAudit(input: {
  actorId?: string | null;
  targetId?: string | null;
  action: string;
  payload?: Prisma.InputJsonValue;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      targetId: input.targetId ?? null,
      action: input.action,
      payload: input.payload ?? {},
    },
  });
}
