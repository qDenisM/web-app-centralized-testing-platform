import type { Application, Exam, Venue, WaitlistEntry } from "../generated/prisma/index.js";

export function venueJson(row: Venue) {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
  };
}

export function examJson(row: Exam & { venue?: Venue }) {
  const seatsLeft = Math.max(row.capacity - row.seatsTaken, 0);
  return {
    id: row.id,
    subjectId: row.subjectId,
    venueId: row.venueId,
    startsAt: row.startsAt.toISOString(),
    duration: row.duration,
    capacity: row.capacity,
    seatsTaken: row.seatsTaken,
    seatsLeft,
    isReserve: row.isReserve,
    venue: row.venue ? venueJson(row.venue) : undefined,
  };
}

export function applicationJson(row: Application & { exam?: Exam & { venue?: Venue } }) {
  return {
    id: row.id,
    examId: row.examId,
    userId: row.userId,
    status: row.status,
    passNumber: row.passNumber,
    passStorageKey: row.passStorageKey,
    hasPass: Boolean(row.passStorageKey),
    rejectReason: row.rejectReason,
    createdAt: row.createdAt.toISOString(),
    exam: row.exam ? examJson(row.exam) : undefined,
  };
}

export function waitlistJson(row: WaitlistEntry & { exam?: Exam & { venue?: Venue } }) {
  return {
    id: row.id,
    examId: row.examId,
    userId: row.userId,
    position: row.position,
    status: row.status,
    offerExpiresAt: row.offerExpiresAt?.toISOString() ?? null,
    exam: row.exam ? examJson(row.exam) : undefined,
  };
}
