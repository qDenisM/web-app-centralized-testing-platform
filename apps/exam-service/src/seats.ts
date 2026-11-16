import type { Application, Exam, Prisma, Venue } from "../generated/prisma/index.js";

type Tx = Prisma.TransactionClient;

const examInclude = { venue: true } as const;

type AppWithExam = Application & {
  exam: Exam & { venue: Venue };
};

export async function releaseSeatAndMaybePromote(
  tx: Tx,
  examId: string,
): Promise<AppWithExam | null> {
  const nextWait = await tx.waitlistEntry.findFirst({
    where: { examId, status: "waiting" },
    orderBy: { position: "asc" },
  });

  if (!nextWait) {
    await tx.$executeRaw`
      UPDATE exams
      SET seats_taken = GREATEST(seats_taken - 1, 0)
      WHERE id = ${examId}::uuid
    `;
    return null;
  }

  await tx.waitlistEntry.update({
    where: { id: nextWait.id },
    data: { status: "accepted", offerExpiresAt: null },
  });

  const existingApp = await tx.application.findUnique({
    where: {
      examId_userId: { examId, userId: nextWait.userId },
    },
  });

  if (existingApp) {
    return tx.application.update({
      where: { id: existingApp.id },
      data: {
        status: "pending",
        rejectReason: null,
        passNumber: null,
        passStorageKey: null,
        createdAt: new Date(),
      },
      include: { exam: { include: examInclude } },
    });
  }

  return tx.application.create({
    data: {
      examId,
      userId: nextWait.userId,
      status: "pending",
    },
    include: { exam: { include: examInclude } },
  });
}

export async function nextPassNumber(tx: Tx, year: number): Promise<string> {
  const count = await tx.application.count({
    where: {
      status: "approved",
      passNumber: { not: null },
    },
  });
  const seq = String(count + 1).padStart(4, "0");
  return `СТ-${year}-${seq}`;
}
